#!/usr/bin/env bash
# Run from the repository root; invoked only by the authorised release workflow.
set -euo pipefail
for path in \
  / \
  /books \
  /books/workspace \
  /checkup \
  /plan \
  /file \
  /put-it-right \
  /trust \
  /learn \
  /passport \
  /uk/public-funding \
  /uk/accountability \
  /uk/cases \
  /uk/cases/haworth-v-hmrc \
  /uk/opportunities \
  /uk/regulator-scrutiny \
  /uk/tax-expert \
  /uk/tax-identity \
  /uk/politics/stand \
  /uk/politics/decisions \
  /learn/history/window-tax \
  /media/window-tax/manifest.json \
  /sitemap.xml \
  /robots.txt \
  /agent.txt \
  /.well-known/agent.txt
do
  curl --fail --silent --show-error \
    --location \
    --connect-timeout 10 --max-time 30 --retry-max-time 120 \
    --retry 12 --retry-delay 5 --retry-all-errors \
    --output /dev/null "https://taxsorted.io${path}"
done

tax_identity_page="${RUNNER_TEMP}/uk-tax-identity.html"
curl --fail --silent --show-error \
  --location \
  --connect-timeout 10 --max-time 30 --retry-max-time 120 \
  --retry 12 --retry-delay 5 --retry-all-errors \
  --output "${tax_identity_page}" \
  https://taxsorted.io/uk/tax-identity
grep --fixed-strings \
  'One subject can carry several tax identities at once.' \
  "${tax_identity_page}" >/dev/null

opportunities_page="${RUNNER_TEMP}/uk-professional-opportunities.html"
scrutiny_page="${RUNNER_TEMP}/uk-regulator-scrutiny.html"
opportunities_headers="${RUNNER_TEMP}/uk-professional-opportunities.headers"
scrutiny_headers="${RUNNER_TEMP}/uk-regulator-scrutiny.headers"
if [ "${FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE}" = open ]
then
  opportunities_marker='Specialist work, mapped without the sales pitch.'
  scrutiny_marker='Public bodies answer to evidence too.'
else
  opportunities_marker='This research is awaiting its required independent review.'
  scrutiny_marker='This evidence ledger is awaiting its required independent review.'
fi

guard_ready=false
for _ in $(seq 1 12)
do
  if curl --fail --silent --show-error --location \
    --connect-timeout 5 --max-time 10 \
    --dump-header "${opportunities_headers}" \
    --output "${opportunities_page}" \
    https://taxsorted.io/uk/opportunities && \
    curl --fail --silent --show-error --location \
    --connect-timeout 5 --max-time 10 \
    --dump-header "${scrutiny_headers}" \
    --output "${scrutiny_page}" \
    https://taxsorted.io/uk/regulator-scrutiny && \
    grep --ignore-case --quiet \
    "^x-taxsorted-professional-opportunity-guard: ${FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE}" \
    "${opportunities_headers}" && \
    grep --ignore-case --quiet \
    "^x-taxsorted-professional-opportunity-guard: ${FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE}" \
    "${scrutiny_headers}" && \
    grep --fixed-strings --quiet \
    "${opportunities_marker}" "${opportunities_page}" && \
    grep --fixed-strings --quiet \
    "${scrutiny_marker}" "${scrutiny_page}"
  then
    guard_ready=true
    break
  fi
  sleep 5
done
if [ "${guard_ready}" != true ]
then
  echo 'The custom domain did not converge on the released professional-opportunity guard.' >&2
  exit 1
fi

if [ "${FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE}" = closed ]
then
  if grep --fixed-strings --quiet \
    'Commercial-property fixtures' "${opportunities_page}" || \
     grep --fixed-strings --quiet \
    'Most automated-penalty decisions reviewed in 2025 to 2026 were cancelled' \
    "${scrutiny_page}"
  then
    echo 'Protected UK professional-opportunity content leaked through a closed frontend gate.' >&2
    exit 1
  fi
fi

frontend_agent_manifest="${RUNNER_TEMP}/frontend-agent.txt"
frontend_well_known_manifest="${RUNNER_TEMP}/frontend-well-known-agent.txt"
api_agent_manifest="${RUNNER_TEMP}/api-agent.txt"
expected_agent_manifest="frontend/public/agent.txt"
manifest_ready=false
for _ in $(seq 1 12)
do
  if curl --fail --silent --show-error --location \
    --connect-timeout 5 --max-time 10 \
    --output "${frontend_agent_manifest}" https://taxsorted.io/agent.txt && \
    curl --fail --silent --show-error --location \
    --connect-timeout 5 --max-time 10 \
    --output "${frontend_well_known_manifest}" \
    https://taxsorted.io/.well-known/agent.txt && \
    curl --fail --silent --show-error \
    --connect-timeout 5 --max-time 10 \
    --output "${api_agent_manifest}" https://api.taxsorted.io/agent.txt && \
    cmp --silent "${expected_agent_manifest}" "${frontend_agent_manifest}" && \
    cmp --silent "${expected_agent_manifest}" "${frontend_well_known_manifest}" && \
    cmp --silent "${expected_agent_manifest}" "${api_agent_manifest}" && \
    cmp --silent "${frontend_agent_manifest}" "${frontend_well_known_manifest}" && \
    cmp --silent "${frontend_agent_manifest}" "${api_agent_manifest}" && \
    grep --fixed-strings --line-regexp --quiet \
    'schema-version: taxsorted.agent-manifest/1' "${frontend_agent_manifest}"
  then
    manifest_ready=true
    break
  fi
  sleep 5
done
if [ "${manifest_ready}" != true ]; then
  echo 'The deployed agent manifests did not converge on the released bytes.' >&2
  for manifest in \
    "${expected_agent_manifest}" \
    "${frontend_agent_manifest}" \
    "${frontend_well_known_manifest}" \
    "${api_agent_manifest}"
  do
    if [ -f "${manifest}" ]; then
      sha256sum "${manifest}" >&2
    else
      echo "Missing manifest: ${manifest}" >&2
    fi
  done
  if ! grep --fixed-strings --line-regexp --quiet \
    'schema-version: taxsorted.agent-manifest/1' "${frontend_agent_manifest}"
  then
    echo 'Frontend manifest is missing the required schema-version line.' >&2
  fi
  exit 1
fi
frontend_manifest_content_type=$(curl --fail --silent --show-error --head --location \
  --connect-timeout 10 --max-time 30 https://taxsorted.io/agent.txt | \
  awk 'tolower($1) == "content-type:" { value=tolower($2) } END { print value }')
case "${frontend_manifest_content_type}" in
  text/plain*) ;;
  *)
    echo "Frontend agent manifest has unexpected content type: ${frontend_manifest_content_type}" >&2
    exit 1
    ;;
esac

for discovery_asset in sitemap.xml robots.txt
do
  expected_discovery_asset="frontend/out/${discovery_asset}"
  deployed_discovery_asset="${RUNNER_TEMP}/${discovery_asset}"
  discovery_ready=false
  for _ in $(seq 1 12)
  do
    if curl --fail --silent --show-error --location \
      --connect-timeout 5 --max-time 10 \
      --output "${deployed_discovery_asset}" \
      "https://taxsorted.io/${discovery_asset}" && \
      cmp --silent \
        "${expected_discovery_asset}" \
        "${deployed_discovery_asset}"
    then
      discovery_ready=true
      break
    fi
    sleep 5
  done
  if [ "${discovery_ready}" != true ]; then
    echo "The deployed ${discovery_asset} did not match the released bytes." >&2
    sha256sum "${expected_discovery_asset}" >&2
    if [ -f "${deployed_discovery_asset}" ]; then
      sha256sum "${deployed_discovery_asset}" >&2
    fi
    exit 1
  fi
done

deployed_window_tax_manifest="${RUNNER_TEMP}/window-tax-manifest.json"
expected_window_tax_manifest="frontend/public/media/window-tax/manifest.json"
window_tax_manifest_ready=false
for _ in $(seq 1 12)
do
  if curl --fail --silent --show-error --location \
    --connect-timeout 5 --max-time 10 \
    --output "${deployed_window_tax_manifest}" \
    https://taxsorted.io/media/window-tax/manifest.json && \
    cmp --silent \
      "${expected_window_tax_manifest}" \
      "${deployed_window_tax_manifest}"
  then
    window_tax_manifest_ready=true
    break
  fi
  sleep 5
done
if [ "${window_tax_manifest_ready}" != true ]; then
  echo 'The deployed Window Tax media manifest did not match the released bytes.' >&2
  sha256sum \
    "${expected_window_tax_manifest}" \
    "${deployed_window_tax_manifest}" >&2
  exit 1
fi

while IFS=$'\t' read -r asset_path expected_sha expected_bytes
do
  deployed_asset="${RUNNER_TEMP}/window-tax-$(basename "${asset_path}")"
  asset_ready=false
  for _ in $(seq 1 12)
  do
    if curl --fail --silent --show-error --location \
      --connect-timeout 5 --max-time 30 \
      --output "${deployed_asset}" \
      "https://taxsorted.io${asset_path}" && \
      test "$(sha256sum "${deployed_asset}" | awk '{ print $1 }')" = "${expected_sha}" && \
      test "$(wc -c < "${deployed_asset}" | tr -d ' ')" = "${expected_bytes}"
    then
      asset_ready=true
      break
    fi
    sleep 5
  done
  if [ "${asset_ready}" != true ]; then
    echo "The deployed Window Tax asset ${asset_path} did not match its manifest." >&2
    if [ -f "${deployed_asset}" ]; then
      sha256sum "${deployed_asset}" >&2
      wc -c "${deployed_asset}" >&2
    fi
    exit 1
  fi
done < <(
  jq --raw-output \
    '.materials[] | [.path, .sha256, (.bytes | tostring)] | @tsv' \
    "${expected_window_tax_manifest}"
)

body=$(mktemp)
trap 'rm -f "$body"' EXIT
for page_and_marker in \
  '/|Pay what the law requires. Claim what the law allows.' \
  '/books|Know where every number came from.' \
  '/books/workspace|TaxSorted does not encrypt or back them up' \
  '/checkup|Find where you stand. Then take the next honest step.' \
  '/plan|See covered lawful choices. Keep the decision yours.' \
  '/file|Nothing moves without your eyes and consent.' \
  '/put-it-right|A mistake is not the end of the road.' \
  '/trust|The boundary should be as visible as the feature.' \
  '/learn|Play the books. Keep the money you can prove.' \
  '/passport|Understanding that travels.' \
  '/uk/charities|Check a charity, understand its tax, ask it for help.' \
  '/uk/accountability|Who checks the checkers' \
  '/uk/tax-expert|Check which tax rules apply to you' \
  '/uk/politics/stand|Start with the work, not the title.' \
  '/uk/politics/decisions|Find where the decision lives.' \
  '/learn/history/window-tax|The paper trail says more than a wall' \
  '/itsa/records|Starter Books' \
  '/itsa/quarter|Quarterly figures'
do
  page=${page_and_marker%%|*}
  marker=${page_and_marker#*|}
  page_ready=false
  for _ in $(seq 1 12)
  do
    if curl --fail --silent --show-error --location --output "$body" \
      --connect-timeout 10 --max-time 30 \
      "https://taxsorted.io${page}" && \
      grep --fixed-strings --quiet "${marker}" "$body"
    then
      page_ready=true
      break
    fi
    sleep 5
  done
  if [ "${page_ready}" != true ]; then
    echo "The deployed guide ${page} did not expose ${marker}." >&2
    exit 1
  fi
done
