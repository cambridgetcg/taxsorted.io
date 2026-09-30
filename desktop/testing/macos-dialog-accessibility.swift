// Native-dialog helper for an explicitly launched synthetic-data test process.
// Compile with: swiftc macos-dialog-accessibility.swift -o <owned temporary file>
// Run: <helper> --pid <pid> --executable <exact app executable> inspect|Cancel|Open|'Save export'
// This uses an existing Accessibility grant; it never requests one. Matching a
// process does not establish that its profile is disposable: the caller owns that
// prerequisite. No window titles, field contents, paths or other UI text escape.
import ApplicationServices
import Darwin
import Foundation

let knownTitles = Set(["Cancel", "Open", "Save", "Save export"])
let permittedActions = Set(["inspect", "Cancel", "Open", "Save export"])
var operation = "invalid"
var sheetCount = 0
var knownButtons: [String] = []

func finish(_ reason: String, succeeded: Bool = false, code: Int32 = 1) -> Never {
    let report: [String: Any] = [
        "schema": "taxsorted.macos-native-dialog/1",
        "operation": operation,
        "sheetCount": sheetCount,
        "knownButtons": knownButtons,
        "succeeded": succeeded,
        "reason": reason,
    ]
    // All strings originate in this file's allowlists, never arbitrary AX values.
    if let data = try? JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]),
       let text = String(data: data, encoding: .utf8) { print(text) }
    exit(code)
}

let arguments = CommandLine.arguments
guard arguments.count == 6, arguments[1] == "--pid", arguments[3] == "--executable",
      let pid = Int32(arguments[2]), pid > 1, pid != getpid(),
      arguments[4].hasPrefix("/"), permittedActions.contains(arguments[5]) else {
    finish("invalid-arguments", code: 2)
}
operation = arguments[5]

func canonicalPath(_ value: String) -> String {
    URL(fileURLWithPath: value).standardizedFileURL.resolvingSymlinksInPath().path
}
let expectedExecutable = canonicalPath(arguments[4])
guard ["Electron", "TaxSorted Local"].contains(URL(fileURLWithPath: expectedExecutable).lastPathComponent) else {
    finish("unsupported-executable", code: 2)
}

struct ProcessIdentity: Equatable {
    let path: String
    let startedSeconds: UInt64
    let startedMicroseconds: UInt64
}

func processIdentity(of target: pid_t, executable: String) -> ProcessIdentity? {
    var info = proc_bsdinfo()
    let size = Int32(MemoryLayout<proc_bsdinfo>.size)
    guard proc_pidinfo(target, PROC_PIDTBSDINFO, 0, &info, size) == size,
          info.pbi_uid == getuid(), info.pbi_ruid == getuid() else { return nil }
    // PROC_PIDPATHINFO_MAXSIZE is a C expression macro unavailable to Swift.
    var buffer = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    guard proc_pidpath(target, &buffer, UInt32(buffer.count)) > 0 else { return nil }
    let path = canonicalPath(String(cString: buffer))
    guard path == executable else { return nil }
    return ProcessIdentity(path: path, startedSeconds: info.pbi_start_tvsec,
                           startedMicroseconds: info.pbi_start_tvusec)
}
func processIdentity() -> ProcessIdentity? {
    processIdentity(of: pid, executable: expectedExecutable)
}

guard let originalIdentity = processIdentity() else { finish("process-identity-mismatch", code: 2) }
guard AXIsProcessTrusted() else { finish("accessibility-not-granted", code: 2) }
let application = AXUIElementCreateApplication(pid)
guard AXUIElementSetMessagingTimeout(application, 0.25) == .success else {
    finish("accessibility-unavailable")
}
let deadline = ProcessInfo.processInfo.systemUptime + 4
var visited = 0
var traversalLimited = false
var inaccessible = false
var inaccessibleReason = "accessibility-read-failed"
// macOS hosts native file-panel content in this system XPC service. It may be
// traversed only below a native modal root already found in the target process,
// never discovered as a separate app/window or accepted by basename alone.
let panelExecutable = canonicalPath("/System/Library/Frameworks/AppKit.framework/Versions/C/XPCServices/com.apple.appkit.xpc.openAndSavePanelService.xpc/Contents/MacOS/com.apple.appkit.xpc.openAndSavePanelService")
var panelIdentities: [pid_t: ProcessIdentity] = [:]

func attribute(_ element: AXUIElement, _ name: String) -> AnyObject? {
    if ProcessInfo.processInfo.systemUptime >= deadline {
        traversalLimited = true
        return nil
    }
    var value: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, name as CFString, &value)
    if result == .cannotComplete || result == .invalidUIElement || result == .apiDisabled {
        inaccessible = true
        inaccessibleReason = result == .cannotComplete ? "accessibility-read-incomplete"
            : result == .invalidUIElement ? "accessibility-element-invalid" : "accessibility-api-disabled"
    }
    return result == .success ? value : nil
}

func enter(_ element: AXUIElement, depth: Int, allowPanelService: Bool = false) -> String? {
    guard depth <= 20, visited < 800, ProcessInfo.processInfo.systemUptime < deadline else {
        traversalLimited = true
        return nil
    }
    visited += 1
    var owner: pid_t = 0
    guard AXUIElementGetPid(element, &owner) == .success else {
        inaccessible = true
        inaccessibleReason = "element-owner-unavailable"
        return nil
    }
    if owner != pid {
        guard allowPanelService,
              let identity = processIdentity(of: owner, executable: panelExecutable),
              panelIdentities[owner] == nil || panelIdentities[owner] == identity else {
            inaccessible = true
            inaccessibleReason = "element-owner-mismatch"
            return nil
        }
        panelIdentities[owner] = identity
        guard AXUIElementSetMessagingTimeout(element, 0.25) == .success else {
            inaccessible = true
            inaccessibleReason = "accessibility-unavailable"
            return nil
        }
    }
    let role = attribute(element, kAXRoleAttribute) as? String
    // Never discover or press HTML buttons, even if labelled like native ones.
    return role == "AXWebArea" ? nil : role
}

var dialogs: [AXUIElement] = []
func discover(_ element: AXUIElement, depth: Int) {
    guard let role = enter(element, depth: depth) else { return }
    let modalDialog = role == kAXWindowRole
        && attribute(element, kAXSubroleAttribute) as? String == kAXDialogSubrole
        && attribute(element, kAXModalAttribute) as? Bool == true
    if role == kAXSheetRole || modalDialog {
        if !dialogs.contains(where: { CFEqual($0, element) }) { dialogs.append(element) }
        return
    }
    // Native sheets may be nested in window groups, but never web content.
    for child in attribute(element, kAXChildrenAttribute) as? [AXUIElement] ?? [] {
        discover(child, depth: depth + 1)
        if traversalLimited || inaccessible { return }
    }
}

guard let windows = attribute(application, kAXWindowsAttribute) as? [AXUIElement] else {
    finish("windows-unavailable")
}
for window in windows {
    discover(window, depth: 0)
    if traversalLimited || inaccessible { break }
}
sheetCount = dialogs.count
var buttons: [String: [AXUIElement]] = [:]
func collectButtons(_ element: AXUIElement, depth: Int) {
    guard let role = enter(element, depth: depth, allowPanelService: true) else { return }
    if role == kAXButtonRole {
        var title: String?
        for key in [kAXTitleAttribute, kAXDescriptionAttribute] {
            if let candidate = attribute(element, key) as? String, knownTitles.contains(candidate) {
                title = candidate
                break
            }
        }
        if let title, attribute(element, kAXEnabledAttribute) as? Bool == true {
            if !(buttons[title] ?? []).contains(where: { CFEqual($0, element) }) {
                buttons[title, default: []].append(element)
            }
        }
    }
    for child in attribute(element, kAXChildrenAttribute) as? [AXUIElement] ?? [] {
        collectButtons(child, depth: depth + 1)
        if traversalLimited || inaccessible { return }
    }
}
for dialog in dialogs {
    collectButtons(dialog, depth: 0)
    if traversalLimited || inaccessible { break }
}
knownButtons = buttons.keys.sorted()
if traversalLimited { finish("traversal-limit") }
if inaccessible { finish(inaccessibleReason) }
guard processIdentity() == originalIdentity else { finish("process-changed") }
guard panelIdentities.allSatisfy({ processIdentity(of: $0.key, executable: panelExecutable) == $0.value }) else {
    finish("panel-service-changed")
}
if operation == "inspect" { finish("inspected", succeeded: true, code: 0) }
guard dialogs.count == 1 else { finish(dialogs.isEmpty ? "no-native-dialog" : "ambiguous-native-dialog") }
guard let candidates = buttons[operation], candidates.count == 1 else {
    finish(buttons[operation] == nil ? "button-unavailable" : "ambiguous-native-button")
}
let button = candidates[0]
// Recheck the native modal boundary, button state and process identity immediately
// before acting; closed/replaced AX elements must fail rather than retargeting.
let dialogRole = attribute(dialogs[0], kAXRoleAttribute) as? String
let stillNative = dialogRole == kAXSheetRole || (dialogRole == kAXWindowRole
    && attribute(dialogs[0], kAXSubroleAttribute) as? String == kAXDialogSubrole
    && attribute(dialogs[0], kAXModalAttribute) as? Bool == true)
guard stillNative, attribute(button, kAXRoleAttribute) as? String == kAXButtonRole,
      attribute(button, kAXEnabledAttribute) as? Bool == true,
      !traversalLimited, !inaccessible, processIdentity() == originalIdentity,
      panelIdentities.allSatisfy({ processIdentity(of: $0.key, executable: panelExecutable) == $0.value }) else {
    finish("dialog-changed")
}
let pressed = AXUIElementPerformAction(button, kAXPressAction as CFString) == .success
finish(pressed ? "button-pressed" : "button-press-failed", succeeded: pressed, code: pressed ? 0 : 1)
