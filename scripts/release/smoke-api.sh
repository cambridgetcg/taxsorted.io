#!/usr/bin/env bash
# Run from the repository root; invoked only by the authorised release workflow.
set -euo pipefail
if [ -z "${TAX_EXPERT_CANARY_API_KEY}" ]; then
  echo 'TAX_EXPERT_CANARY_API_KEY is required to prove workspace inspection, SDLT and tax-expert paths.' >&2
  exit 1
fi
for path in \
  /v1/health \
  /agent.txt \
  /.well-known/agent.txt \
  /v1/wake \
  /openapi.json \
  /openapi-public.json \
  /openapi/tax-system-uk.json \
  /openapi/tax-identity-uk.json \
  /openapi/tax-industry-uk.json \
  /openapi/charities-uk.json \
  /openapi/public-funding-uk.json \
  /openapi/politics-uk.json \
  /openapi/accountability-uk.json \
  /openapi/case-commons-uk.json \
  /openapi/professional-opportunities-uk.json \
  /openapi/why-graph.json \
  /openapi/tax-expert-uk.json \
  /openapi/professional-tools-uk.json \
  /v1/open-data \
  /v1/open-data/rights \
  /v1/open-data/releases \
  /v1/open-data/releases/feed.json \
  /v1/open-data/releases/feed.atom \
  /v1/tax-system/uk/records/src-parliament-tax-procedure \
  /v1/tax-identity/uk/schema \
  /v1/tax-identity/uk/rights \
  /v1/tax-industry/uk/records/src-industry-regulation-response \
  /v1/charities/uk/records/src-charities-act-2011 \
  /v1/charities/uk \
  /v1/charities/uk/manifest \
  /v1/charities/uk/sources \
  /v1/charities/uk/registers \
  /v1/charities/uk/accountability \
  /v1/charities/uk/accountability/schema \
  /v1/accountability/uk \
  /v1/accountability/uk/schema \
  /v1/case-commons/uk/method \
  /v1/case-commons/uk/sources \
  /v1/case-commons/uk/assessment-template \
  /v1/case-commons/uk/assessment-schema \
  /v1/case-commons/uk/schema \
  /v1/case-commons/uk/packet-schema \
  /v1/case-commons/uk/rights \
  /v1/case-commons/uk/interpretation \
  /v1/case-commons/uk/interpretation/schema \
  /v1/case-commons/uk/agent \
  /v1/case-commons/uk/training/schema \
  /v1/professional-opportunities/uk/assessment-template \
  /v1/professional-opportunities/uk/assessment-schema \
  /v1/professional-opportunities/uk/schema \
  /v1/professional-opportunities/uk/packet-schema \
  /v1/professional-opportunities/uk/rights \
  /v1/why-graph \
  /v1/why-graph/adopters \
  /v1/why-graph/schema \
  /v1/uk/professional-tools \
  /v1/uk/tax-expert \
  /v1/uk/tax-expert/tax-position-passport/schema \
  /v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax \
  /v1/public-funding/uk \
  /v1/public-funding/uk/manifest \
  /v1/public-funding/uk/sources \
  /v1/public-funding/uk/changes \
  /v1/public-funding/uk/records/src-hmt-spending-review-2025
do
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 --retry-max-time 120 \
    --retry 12 --retry-delay 5 --retry-all-errors \
    --output /dev/null "https://api.taxsorted.io${path}"
done

case_wake="${RUNNER_TEMP}/case-commons-wake.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${case_wake}" \
  https://api.taxsorted.io/v1/wake
case_state=$(jq --raw-output \
  '.resources.caseCommons.availability' "${case_wake}")
dispute_state=$(jq --raw-output \
  '.resources.caseCommons.interpretationAvailability' "${case_wake}")
dispute_emitted=$(jq --raw-output \
  '.resources.whyGraph.thirdAdopter.runtimeEmitted' "${case_wake}")
tax_identity_state=$(jq --raw-output \
  '.resources.taxIdentity.availability' "${case_wake}")

case "${dispute_state}:${dispute_emitted}" in
  exact-release-verified-on-request:true) ;;
  derived-release-review:false) ;;
  emergency-stopped:false) ;;
  *)
    echo "Tax-dispute discovery state disagrees: ${dispute_state}:${dispute_emitted}" >&2
    exit 1
    ;;
esac
if [ "${dispute_state}" = "exact-release-verified-on-request" ] && \
   [ "${case_state}" != "open" ]; then
  echo "Tax-dispute routes cannot be advertised while case commons is ${case_state}" >&2
  exit 1
fi

tax_identity_index=0
for path in \
  /v1/tax-identity/uk \
  /v1/tax-identity/uk/graph \
  /v1/tax-identity/uk/examples/example-trading-llp
do
  tax_identity_index=$((tax_identity_index + 1))
  tax_identity_body="${RUNNER_TEMP}/tax-identity-${tax_identity_index}.json"
  tax_identity_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --output "${tax_identity_body}" --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${tax_identity_state}:${tax_identity_status}" in
    open:200) ;;
    emergency-stopped:503)
      jq --exit-status '
        .error == "tax_identity_emergency_stop" and
        .status == 503 and
        .available == false and
        .emergencyStop == true
      ' "${tax_identity_body}" >/dev/null
      ;;
    *)
      echo "Tax-identity availability and route disagree: ${tax_identity_state}:${tax_identity_status} ${path}" >&2
      exit 1
      ;;
  esac
done

tax_identity_catalog="${RUNNER_TEMP}/tax-identity-catalog.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${tax_identity_catalog}" \
  https://api.taxsorted.io/v1/open-data
jq --exit-status --arg state "${tax_identity_state}" '
  (.datasets | length) == 5 and
  (.frameworks | length) == 1 and
  .frameworks[0].id == "uk-tax-identity-framework" and
  .frameworks[0].kind == "interpretation-framework" and
  .frameworks[0].availability.status == $state and
  .frameworks[0].availability.humanGuideAvailable == true and
  .frameworks[0].access.authentication == "none" and
  .frameworks[0].access.session == "none" and
  .frameworks[0].access.cookies == "none" and
  .frameworks[0].access.writes == false and
  .frameworks[0].access.personalFactsAccepted == false and
  .frameworks[0].access.cors == "*" and
  .frameworks[0].boundaries.sourceBackedOnly == true and
  .frameworks[0].boundaries.syntheticExamplesOnly == true and
  .frameworks[0].boundaries.personalFactsAccepted == false and
  .frameworks[0].resources.openApi == "/openapi/tax-identity-uk.json" and
  (.frameworks[0].resources | has("recordResolver") | not) and
  (.frameworks[0].resources | has("exports") | not)
' "${tax_identity_catalog}" >/dev/null

tax_identity_rights_catalog="${RUNNER_TEMP}/tax-identity-rights-catalog.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${tax_identity_rights_catalog}" \
  https://api.taxsorted.io/v1/open-data/rights
jq --exit-status '
  .frameworkRights.taxIdentity == "/v1/tax-identity/uk/rights"
' "${tax_identity_rights_catalog}" >/dev/null

case_index=0
for path in \
  /v1/case-commons/uk \
  /v1/case-commons/uk/cases \
  /v1/case-commons/uk/cases/haworth-v-hmrc-2021
do
  case_index=$((case_index + 1))
  case_body="${RUNNER_TEMP}/case-commons-${case_index}.json"
  case_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --output "${case_body}" --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${case_state}:${case_status}" in
    open:200)
      jq --exit-status '
        (.schema == "taxsorted.uk.case-commons/1") or
        (.schema == "taxsorted.uk.case-packet/1")
      ' "${case_body}" >/dev/null
      ;;
    publication-review:503)
      jq --exit-status \
        '.error == "publication_review_pending" and .status == 503' \
        "${case_body}" >/dev/null
      ;;
    emergency-stopped:503)
      jq --exit-status \
        '.error == "publication_emergency_stop" and .status == 503' \
        "${case_body}" >/dev/null
      ;;
    case-level-stops-active:200)
      jq --exit-status '
        .availability.status == "case-level-stops-active" or
        .availability == "case-level-stops-active" or
        .schema == "taxsorted.uk.case-packet/1"
      ' "${case_body}" >/dev/null
      ;;
    case-level-stops-active:503)
      jq --exit-status \
        '.error == "case_publication_stop" and .status == 503 and .stoppedCaseCount > 0' \
        "${case_body}" >/dev/null
      ;;
    *)
      echo "Case-commons state disagrees: ${case_state}:${case_status} for ${path}" >&2
      exit 1
      ;;
  esac
done

dispute_index=0
for route in \
  '/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation|taxsorted.uk.tax-dispute-interpretation/1|json' \
  '/v1/case-commons/uk/cases/haworth-v-hmrc-2021/why-graph|taxsorted.why-graph/1|json' \
  '/v1/case-commons/uk/training|taxsorted.uk.tax-dispute-training/1|json' \
  '/v1/case-commons/uk/training/examples|taxsorted.uk.tax-dispute-training-bundle/1|json' \
  '/v1/case-commons/uk/training/examples.ndjson|taxsorted.uk.tax-dispute-training-example/1|ndjson'
do
  dispute_index=$((dispute_index + 1))
  path="${route%%|*}"
  route_tail="${route#*|}"
  expected_schema="${route_tail%%|*}"
  representation="${route_tail##*|}"
  dispute_body="${RUNNER_TEMP}/tax-dispute-${dispute_index}.body"
  dispute_headers="${RUNNER_TEMP}/tax-dispute-${dispute_index}.headers"
  dispute_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --dump-header "${dispute_headers}" \
    --output "${dispute_body}" --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${case_state}:${dispute_state}:${dispute_status}" in
    open:exact-release-verified-on-request:200)
      if [ "${representation}" = "ndjson" ]; then
        test -s "${dispute_body}"
        awk '
          tolower($1) == "content-type:" &&
          index(tolower($0), "application/x-ndjson") { found = 1 }
          END { exit !found }
        ' "${dispute_headers}"
        sed -n '1p' "${dispute_body}" | \
          jq --exit-status --arg schema "${expected_schema}" \
            '.schema == $schema' >/dev/null
      else
        jq --exit-status --arg schema "${expected_schema}" \
          '.schema == $schema' "${dispute_body}" >/dev/null
      fi
      ;;
    open:derived-release-review:503)
      jq --exit-status '
        .error == "tax_dispute_interpretation_review_pending" and
        .status == 503 and
        .availability == "derived-release-review"
      ' "${dispute_body}" >/dev/null
      ;;
    open:emergency-stopped:503)
      jq --exit-status '
        .error == "tax_dispute_interpretation_review_pending" and
        .status == 503 and
        .reason == "derived-release-emergency-stop"
      ' "${dispute_body}" >/dev/null
      ;;
    publication-review:*:503)
      jq --exit-status \
        '.error == "publication_review_pending" and .status == 503' \
        "${dispute_body}" >/dev/null
      ;;
    emergency-stopped:*:503)
      jq --exit-status \
        '.error == "publication_emergency_stop" and .status == 503' \
        "${dispute_body}" >/dev/null
      ;;
    case-level-stops-active:*:503)
      jq --exit-status \
        '.error == "case_publication_stop" and .status == 503 and .stoppedCaseCount > 0' \
        "${dispute_body}" >/dev/null
      ;;
    *)
      echo "Tax-dispute availability and route disagree: ${case_state}:${dispute_state}:${dispute_status} ${path}" >&2
      exit 1
      ;;
  esac
done

professional_state=$(jq --raw-output \
  '.resources.professionalOpportunities.availability' "${case_wake}")
echo "professional_opportunities_state=${professional_state}" \
  >>"${GITHUB_OUTPUT}"
professional_index=0
for path in \
  /v1/professional-opportunities/uk \
  /v1/professional-opportunities/uk/method \
  /v1/professional-opportunities/uk/opportunities \
  /v1/professional-opportunities/uk/scrutiny \
  /v1/professional-opportunities/uk/sources
do
  professional_index=$((professional_index + 1))
  professional_body="${RUNNER_TEMP}/professional-opportunities-${professional_index}.json"
  professional_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --output "${professional_body}" --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${professional_state}:${professional_status}" in
    open:200)
      jq --exit-status \
        '.schema == "taxsorted.uk.professional-opportunities.v1"' \
        "${professional_body}" >/dev/null
      ;;
    publication-review:503)
      jq --exit-status \
        '.error == "publication_review_pending" and .status == 503' \
        "${professional_body}" >/dev/null
      ;;
    emergency-stopped:503)
      jq --exit-status \
        '.error == "publication_emergency_stop" and .status == 503' \
        "${professional_body}" >/dev/null
      ;;
    record-level-stops-active:200)
      jq --exit-status '
        .method != null or
        .availability.status == "record-level-stops-active" or
        .availability == "record-level-stops-active"
      ' "${professional_body}" >/dev/null
      ;;
    record-level-stops-active:503)
      jq --exit-status '
        .error == "opportunity_publication_stop" and
        .status == 503 and
        .stoppedOpportunityCount > 0
      ' "${professional_body}" >/dev/null
      ;;
    *)
      echo "Professional-opportunity state disagrees: ${professional_state}:${professional_status} for ${path}" >&2
      exit 1
      ;;
  esac
done

if [ "${professional_state}" = open ]; then
  professional_id=$(curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    https://api.taxsorted.io/v1/professional-opportunities/uk/opportunities | \
    jq --raw-output '.opportunities[0].id // empty')
  test -n "${professional_id}"
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    "https://api.taxsorted.io/v1/professional-opportunities/uk/opportunities/${professional_id}" | \
    jq --exit-status '
      .schema == "taxsorted.uk.professional-opportunity-packet/1" and
      (.integrity.digest | test("^sha256:[0-9a-f]{64}$"))
    ' >/dev/null
fi

politics_root="${RUNNER_TEMP}/politics-root.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 --retry-max-time 120 \
  --retry 12 --retry-delay 5 --retry-all-errors \
  --header 'Cache-Control: no-cache' \
  --output "${politics_root}" \
  https://api.taxsorted.io/v1/politics/uk
pathway_publication_status=$(jq --raw-output \
  '.publicOfficePathways.status' "${politics_root}")
decision_pathway_publication_status=$(jq --raw-output \
  '.publicDecisionPathways.status' "${politics_root}")

pathway_index=0
for path in \
  /v1/politics/uk/public-office-pathways \
  /v1/politics/uk/public-office-pathways/rights \
  /v1/politics/uk/public-office-pathways/schema
do
  pathway_index=$((pathway_index + 1))
  pathway_headers="${RUNNER_TEMP}/pathway-${pathway_index}.headers"
  pathway_body="${RUNNER_TEMP}/pathway-${pathway_index}.json"
  pathway_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --dump-header "${pathway_headers}" --output "${pathway_body}" \
    --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${pathway_publication_status}:${pathway_status}" in
    open:200)
      jq --exit-status \
        '(.schema == "taxsorted.uk.public-office-pathways/1") or (.schema == "taxsorted.uk.public-office-pathways-rights/1") or (."$id" == "https://api.taxsorted.io/v1/politics/uk/public-office-pathways/schema")' \
        "${pathway_body}" >/dev/null
      ;;
    emergency-stopped:503)
      awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
        "${pathway_headers}"
      jq --exit-status \
        '.error == "bulk_data_emergency_stop" and .status == 503' \
        "${pathway_body}" >/dev/null
      ;;
    *)
      echo "Public-office pathway state disagrees: ${pathway_publication_status}:${pathway_status} for ${path}" >&2
      exit 1
      ;;
  esac
done

decision_pathway_index=0
for path in \
  /v1/politics/uk/public-decision-pathways \
  /v1/politics/uk/public-decision-pathways/decisions \
  /v1/politics/uk/public-decision-pathways/decisions/uk-central-tax-policy-primary-law \
  /v1/politics/uk/public-decision-pathways/doors \
  /v1/politics/uk/public-decision-pathways/rights \
  /v1/politics/uk/public-decision-pathways/schema
do
  decision_pathway_index=$((decision_pathway_index + 1))
  decision_headers="${RUNNER_TEMP}/decision-pathway-${decision_pathway_index}.headers"
  decision_body="${RUNNER_TEMP}/decision-pathway-${decision_pathway_index}.json"
  decision_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header 'Cache-Control: no-cache' \
    --dump-header "${decision_headers}" --output "${decision_body}" \
    --write-out '%{http_code}' \
    "https://api.taxsorted.io${path}")
  case "${decision_pathway_publication_status}:${decision_status}" in
    open:200)
      case "${path}" in
        /v1/politics/uk/public-decision-pathways)
          jq --exit-status '
            .schema == "taxsorted.uk.public-decision-pathways/1" and
            .availability.status == "open" and
            .availability.writes == false
          ' "${decision_body}" >/dev/null
          ;;
        /v1/politics/uk/public-decision-pathways/decisions)
          jq --exit-status '
            .schema == "taxsorted.uk.public-decision-pathways/1" and
            (.decisions | length == 1) and
            (.personalRoutes | length == 2)
          ' "${decision_body}" >/dev/null
          ;;
        /v1/politics/uk/public-decision-pathways/decisions/uk-central-tax-policy-primary-law)
          jq --exit-status '
            .schema == "taxsorted.uk.public-decision-pathways/1" and
            .pathway.id == "uk-central-tax-policy-primary-law" and
            (.pathway.stages | length == 10)
          ' "${decision_body}" >/dev/null
          ;;
        /v1/politics/uk/public-decision-pathways/doors)
          jq --exit-status '
            .schema == "taxsorted.uk.public-decision-pathways/1" and
            (.publicDoors | length == 8) and
            (.eventWindows[0].checkedOn == "2026-07-16")
          ' "${decision_body}" >/dev/null
          ;;
        /v1/politics/uk/public-decision-pathways/rights)
          jq --exit-status '
            .schema == "taxsorted.uk.public-decision-pathways-rights/1" and
            .status == "mixed-rights-read-before-reuse"
          ' "${decision_body}" >/dev/null
          ;;
        /v1/politics/uk/public-decision-pathways/schema)
          jq --exit-status '
            ."$id" == "https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/schema"
          ' "${decision_body}" >/dev/null
          ;;
      esac
      ;;
    emergency-stopped:503)
      awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
        "${decision_headers}"
      jq --exit-status \
        '.error == "bulk_data_emergency_stop" and .status == 503' \
        "${decision_body}" >/dev/null
      ;;
    *)
      echo "Public-decision pathway state disagrees: ${decision_pathway_publication_status}:${decision_status} for ${path}" >&2
      exit 1
      ;;
  esac
done

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/health | \
  jq --exit-status '
    .ok == true and
    .hmrc.configured == true and
    .hmrc.env == "sandbox"
  ' >/dev/null

passport_schema="${RUNNER_TEMP}/tax-position-passport.schema.json"
passport_example="${RUNNER_TEMP}/tax-position-passport.example.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${passport_schema}" \
  https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema
jq --exit-status '
  ."$schema" == "https://json-schema.org/draft/2020-12/schema" and
  ."$id" == "https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema" and
  ."x-taxsorted-generation" == "Committed build-time snapshot of TaxPositionPassportSchema; no runtime schema conversion." and
  .additionalProperties == false and
  (has("x-taxsorted-structural-dependencies") | not) and
  .properties.positions.items.properties.request.additionalProperties == false and
  .properties.positions.items.properties.answer.additionalProperties == false and
  .properties.positions.items.properties.request.properties.exemption.properties.returnIndicators.anyOf[0].uniqueItems == true
' "${passport_schema}" >/dev/null
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${passport_example}" \
  https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax
jq --exit-status '
  .schema == "taxsorted.uk.tax-position-passport/1" and
  .assurance.identityVerified == false and
  .assurance.signed == false and
  .assurance.professionallyReviewed == false and
  .assurance.filed == false and
  .dataHandling.sentToTaxSorted == false and
  .dataHandling.rawDocumentsIncluded == false and
  (.profile.incomeSources | length) == 5 and
  (.profile.evidence | length) == 8 and
  (.positions | length) == 1 and
  .positions[0].answer.capability.id == "uk.mtd-income-tax.readiness"
' "${passport_example}" >/dev/null

api_agent_manifest="${RUNNER_TEMP}/api-agent.txt"
api_well_known_manifest="${RUNNER_TEMP}/api-well-known-agent.txt"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --output "${api_agent_manifest}" \
  https://api.taxsorted.io/agent.txt
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --output "${api_well_known_manifest}" \
  https://api.taxsorted.io/.well-known/agent.txt
cmp --silent "${api_agent_manifest}" "${api_well_known_manifest}"
grep --fixed-strings --line-regexp \
  'schema-version: taxsorted.agent-manifest/1' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'charity-accountability-status: schema-only-not-admitted' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-office-pathways-effects: read-only guidance; no eligibility decision, application, nomination, account, tracking or political recommendation' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-office-pathways-availability: public outside the pending bulk-record and named-person gates; returns 503 while the politics bulk emergency stop is active' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-office-pathways-rights: GET https://api.taxsorted.io/v1/politics/uk/public-office-pathways/rights' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-decision-pathways-decisions: GET https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/decisions' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-decision-pathways-effects: read-only general guidance; no political profile; no personalised, ideological or ranked recommendation; no effectiveness score, account, tracking, message, submission, appeal decision or legal representation' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-decision-pathways-event-status: every event window is dated; compare checkedOn and closesOn, then verify the official source before acting' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'politics-public-decision-pathways-rights: GET https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/rights' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'charity-accountability-records: none' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'observer-accountability-status: schema-only-not-admitted' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'observer-accountability-records: none' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'why-graph-framework: GET https://api.taxsorted.io/v1/why-graph' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'why-graph-adopters: GET https://api.taxsorted.io/v1/why-graph/adopters' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'why-graph-schema: GET https://api.taxsorted.io/v1/why-graph/schema' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'why-graph-openapi: GET https://api.taxsorted.io/openapi/why-graph.json' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'why-graph-writes: none; read-only framework with no ingestion route' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-identity: GET https://api.taxsorted.io/v1/tax-identity/uk' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-identity-openapi: GET https://api.taxsorted.io/openapi/tax-identity-uk.json' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-identity-effects: read-only reviewed framework and synthetic examples; no personal fact intake, identity decision, advice, filing or external state change' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'charity-tax-treatment-why-graph: GET https://api.taxsorted.io/v1/charities/uk/tax-treatments/{id}/why-graph' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-tools: GET https://api.taxsorted.io/v1/uk/professional-tools' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-tools-openapi: GET https://api.taxsorted.io/openapi/professional-tools-uk.json' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-tools-access-gap: no public self-service key provisioning and no confidential access-request intake' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-workspace-key: GET https://api.taxsorted.io/v1/api-workspace' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-workspace-key-authentication: Bearer TaxSorted workspace key; no task scope required' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-workspace-key-cors: server-to-server; browser bearer calls are not supported' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-workspace-key-input: no query string and no declared request body; either is rejected with 400 before authentication; no client or tax facts' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-key-lifecycle: operator-managed inspect, finite-expiry issue, overlapping rotate and explicit revoke; no self-service, public delivery or authenticated admin audit trail' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-tools-data-boundary: the key identifies the calling workspace; minimized financial or transaction facts may still be personal data without direct identifiers' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'professional-tools-production-contract-gaps: no published rate limit, professional privacy and retention policy, security assessment, self-service key lifecycle, authenticated admin audit trail, high-availability contract or SLA' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'sdlt-calculation: POST https://api.taxsorted.io/v1/uk/sdlt/calculations' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'sdlt-calculation-required-scope: sdlt:calculate' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-manifest: GET https://api.taxsorted.io/v1/uk/tax-expert' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-openapi: GET https://api.taxsorted.io/openapi/tax-expert-uk.json' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment: POST https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-required-scope: tax-expert:assess' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-availability: credentialed design partner; no public self-service key provisioning' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-request-fact-storage: not written to application storage' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-retry-effects: none; no application state write or external submission' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-result-stability: not byte-stable across trusted evaluation date or admitted ruleset/source ledger changes' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'tax-expert-assessment-cors: server-to-server; browser bearer calls are not supported' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'methods: GET, HEAD, OPTIONS' "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'methods-scope: this doorway only; linked task tools declare methods separately' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'corrections-account: a GitHub account is required to submit a public correction' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'openapi-public: GET https://api.taxsorted.io/openapi-public.json' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'release-ledger: GET https://api.taxsorted.io/v1/open-data/releases' \
  "${api_agent_manifest}"
grep --fixed-strings --line-regexp \
  'formats: application/json, application/x-ndjson, text/csv, application/feed+json, application/atom+xml' \
  "${api_agent_manifest}"
api_manifest_content_type=$(curl --fail --silent --show-error --head \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/agent.txt | \
  awk 'tolower($1) == "content-type:" { print tolower($2); exit }')
case "${api_manifest_content_type}" in
  text/plain*) ;;
  *)
    echo "API agent manifest has unexpected content type: ${api_manifest_content_type}" >&2
    exit 1
    ;;
esac

current_changes="${RUNNER_TEMP}/public-funding-changes-after.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${current_changes}" \
  'https://api.taxsorted.io/v1/public-funding/uk/changes?limit=100'
jq --exit-status --slurpfile before \
  "${RUNNER_TEMP}/public-funding-change-prefix.json" '
    ($before[0]) as $old |
    (.page.hasMore == false) and
    ((.data | type) == "array") and
    ((.data | length) >= ($old | length)) and
    (.data[0:($old | length)] == $old)
  ' "${current_changes}" >/dev/null

current_releases="${RUNNER_TEMP}/release-ledger-after.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Cache-Control: no-cache' \
  --output "${current_releases}" \
  'https://api.taxsorted.io/v1/open-data/releases'
jq --exit-status \
  --slurpfile before "${RUNNER_TEMP}/release-checkpoint-prefix.json" \
  --slurpfile candidate api/src/release-checkpoints.json '
    ($before[0]) as $old |
    (.schema == "taxsorted.open-data-release-ledger/1") and
    (.checkpoints == $candidate[0]) and
    ((.checkpoints | length) >= ($old | length)) and
    (.checkpoints[0:($old | length)] == $old)
  ' "${current_releases}" >/dev/null

curl --fail --silent --show-error \
  https://api.taxsorted.io/v1/charities/uk/accountability | \
  jq --exit-status \
    '.status == "schema-only-not-admitted" and
     (.publicationBlockers | length) == 2 and
     ([.publicationBlockers[].status] | all(. == "blocking")) and
     (.publicationBlockerScope | contains("not the complete publication test")) and
     (.admissionConditions | length) == 9 and
     ([.admissionConditions[].status] | all(. == "required-not-satisfied")) and
     (.collectionGuide | length) == 17 and
     (.hardBoundaries | any(contains("every financial fact has a disclosure review"))) and
     (.hardBoundaries | any(contains("every public document and source-review field"))) and
     .publicationAdmission.currentSchema == "candidate-shape-only" and
     .publicationAdmission.externalEnvelopeRequired == true' >/dev/null

curl --fail --silent --show-error \
  https://api.taxsorted.io/v1/charities/uk/accountability/schema | \
  jq --exit-status \
    '.["$id"] == "https://api.taxsorted.io/v1/charities/uk/accountability/schema" and
     .additionalProperties == false and
     .properties.meta.properties.publicationStatus.const == "candidate-not-admitted" and
     ((.properties.financialFacts.items.required | index("statisticalDisclosureReview")) != null) and
     ((.properties.comparisons.items.required | index("statisticalDisclosureReview")) != null) and
     .properties.documents.items.properties.sourceReview.properties.publicDocumentAndReviewFieldsReview.properties.sourceBodyOrExcerptPresent.const == false and
     .properties.documents.items.properties.sourceReview.properties.publicDocumentAndReviewFieldsReview.properties.locatorsContainPointersOnly.const == true and
     .properties.documents.items.properties.sourceReview.properties.notes.maxItems == 5' >/dev/null

curl --fail --silent --show-error \
  https://api.taxsorted.io/v1/accountability/uk | \
  jq --exit-status '
    .status == "schema-only-not-admitted" and
    .principle.name == "the-observer-is-also-observed" and
    .candidateContract.recordsAvailable == false and
    ([.candidateContract.counts[]] | all(. == 0)) and
    (.officialDoors | length) > 10 and
    (.reciprocityInvariant.rule | contains("Every observer")) and
    (.hardWalls | any(contains("investigation records remain zero-row")))' >/dev/null

curl --fail --silent --show-error \
  https://api.taxsorted.io/v1/accountability/uk/schema | \
  jq --exit-status '
    .["$id"] == "https://api.taxsorted.io/v1/accountability/uk/schema" and
    .additionalProperties == false and
    .properties.meta.properties.status.const == "candidate-not-admitted" and
    (.properties | has("institutionalRelations")) and
    (.properties | has("investigationEngagements")) and
    (.properties | has("investigationActions")) and
    (.properties | has("institutionalResponses")) and
    (.properties | has("coverageGaps"))' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/why-graph | \
  jq --exit-status '
    .schema == "taxsorted.why-graph-framework/1" and
    .graphSchema == "taxsorted.why-graph/1" and
    .status == "first-adopter-live" and
    .adoption.status == "first-adopter" and
    .adoption.endpoint == "/v1/uk/tax-expert/mtd-income-tax/assessments" and
    .adoption.responsePath == "/reasoning/whyGraph" and
    .adoption.capabilityVersion == "2026-07-11.5" and
    .routes.framework == "/v1/why-graph" and
    .routes.schema == "/v1/why-graph/schema" and
    .routes.openApi == "/openapi/why-graph.json" and
    .representation.current == "bounded-typed-json-adjacency" and
    ([.recordReferences[].kind] | sort) == ["dataset-record", "external-resource", "response-record"] and
    (.canonicalTruth | contains("derived connective layer")) and
    (.boundaries | any(contains("No ingestion")))' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/why-graph/adopters | \
  jq --exit-status '
    .schema == "taxsorted.why-graph-adopters/1" and
    .graphSchema == "taxsorted.why-graph/1" and
    (.adopters | length) == 3 and
    (.adopters | any(
      .id == "uk.mtd-income-tax.readiness" and
      .adoptionOrder == 1 and
      .representation == "embedded-response" and
      .access == "workspace-key"
    )) and
    (.adopters | any(
      .id == "uk.charities.tax-treatment" and
      .adoptionOrder == 2 and
      .status == "live-when-dataset-open" and
      .representation == "standalone-resource" and
      .endpoint == "/v1/charities/uk/tax-treatments/{id}/why-graph" and
      .access == "public-sessionless" and
      (.claimSelectors | length) == 9 and
      (.claimSelectors | any(
        .nodeId == "claim:reasoning" and
        .jsonPointer == "/reasoning"
      ))
    )) and
    (.adopters | any(
      .id == "uk.case-commons.tax-dispute" and
      .adoptionOrder == 3 and
      .status == "available-when-exact-derived-release-approved" and
      .representation == "standalone-resource" and
      .endpoint == "/v1/case-commons/uk/cases/{caseId}/why-graph" and
      .access == "public-sessionless"
    ))' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/why-graph/schema | \
  jq --exit-status '
    .["$id"] == "https://api.taxsorted.io/v1/why-graph/schema" and
    .additionalProperties == false and
    .properties.schema.const == "taxsorted.why-graph/1" and
    .properties.nodes.minItems == 1 and
    .properties.nodes.maxItems == 250 and
    .properties.edges.maxItems == 1000 and
    .["x-taxsorted-validation-scope"] == "structural-shape-only" and
    (.["x-taxsorted-runtime-invariants"] | length) > 0' >/dev/null

why_write_headers="${RUNNER_TEMP}/why-graph-write.headers"
why_write_body="${RUNNER_TEMP}/why-graph-write.json"
why_write_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --dump-header "${why_write_headers}" --output "${why_write_body}" \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/why-graph)
test "${why_write_status}" = '405'
awk 'tolower($1) == "allow:" { gsub("\\r", "", $0); found = ($0 ~ /GET, HEAD, OPTIONS$/) } END { exit !found }' \
  "${why_write_headers}"
awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
  "${why_write_headers}"
jq --exit-status '
  .error == "method_not_allowed" and
  .graphCreated == false and
  .externalStateChanged == false
' "${why_write_body}" >/dev/null

why_cors_headers="${RUNNER_TEMP}/why-graph-cors.headers"
why_cors_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request OPTIONS \
  --header 'Origin: https://builder.example' \
  --header 'Access-Control-Request-Method: GET' \
  --dump-header "${why_cors_headers}" --output /dev/null \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/why-graph)
test "${why_cors_status}" = '204'
awk 'tolower($1) == "access-control-allow-origin:" { gsub("\\r", "", $2); found = ($2 == "*") } END { exit !found }' \
  "${why_cors_headers}"
awk 'tolower($1) == "access-control-allow-methods:" { line = tolower($0); sub(/^[^:]+:[[:space:]]*/, "", line); gsub(/[[:space:]\\r]/, "", line); found = (line == "get,head,options") } END { exit !found }' \
  "${why_cors_headers}"
publication_status=$(curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/charities/uk | \
  jq --raw-output '.publication.status')
graph_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --output /dev/null --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/charities/uk/graph)
case "${publication_status}:${graph_status}" in
  open:200|publication-review:503|emergency-stopped:503) ;;
  *)
    echo "Charity publication and graph disagree: ${publication_status}:${graph_status}" >&2
    exit 1
    ;;
esac

declares_new_open_charity_checkpoint=$(jq --raw-output \
  --slurpfile before "${RUNNER_TEMP}/release-checkpoint-prefix.json" '
    ([.[] | select(.datasetId == "uk-charities-sector")]) as $candidate |
    ([$before[0][] | select(.datasetId == "uk-charities-sector")]) as $published |
    (($candidate | length) > ($published | length)) and
    ($candidate[-1].publicationStatusAtCheckpoint == "open")
  ' api/src/release-checkpoints.json)
if [ "${declares_new_open_charity_checkpoint}" = true ] && \
   [ "${publication_status}" != open ]
then
  echo 'A new charity checkpoint declares an observed open release, but the deployed corpus is not open.' >&2
  exit 1
fi

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/openapi/charities-uk.json | \
  jq --exit-status '
    .paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].get.security == [] and
    .paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].head.security == [] and
    .paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/WhyGraph" and
    (.paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].get.responses | has("503")) and
    .paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].get.responses["200"].headers["X-Schema-Version"].schema.enum == ["taxsorted.why-graph/1"] and
    .paths["/v1/charities/uk/tax-treatments/{id}/why-graph"].get.responses["200"].headers["X-TaxSorted-Why-Graph-Adopter"].schema.enum == ["uk.charities.tax-treatment"] and
    .paths["/v1/charities/uk/tax-rules"].get.security == [] and
    .paths["/v1/charities/uk/tax-rules"].head.security == [] and
    .paths["/v1/charities/uk/tax-rules"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/UkCharityTaxRuleList" and
    .paths["/v1/charities/uk/tax-rules/{id}"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/UkCharityTaxRuleDetail" and
    .paths["/v1/charities/uk/tax-rules/{id}"].head.security == [] and
    .paths["/v1/charities/uk/official-procedures"].get.security == [] and
    .paths["/v1/charities/uk/official-procedures"].head.security == [] and
    .paths["/v1/charities/uk/official-procedures"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/UkCharityOfficialProcedureList" and
    .paths["/v1/charities/uk/official-procedures/{id}"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/UkCharityOfficialProcedureDetail" and
    .paths["/v1/charities/uk/official-procedures/{id}"].head.security == [] and
    any(.paths["/v1/charities/uk/tax-rules"].get.parameters[];
      .name == "jurisdiction" and (.schema.enum | length) == 6) and
    any(.paths["/v1/charities/uk/official-procedures"].get.parameters[];
      .name == "procedureType" and
      (.schema.enum | index("attribution-specification-determination")) != null and
      (.schema.enum | index("no-return-determination-and-superseding-return")) != null and
      (.schema.enum | index("taking-control-of-goods-recovery")) != null and
      (.schema.enum | index("summary-warrant-recovery")) != null and
      (.schema.enum | index("distraint-recovery")) != null) and
    any(.paths["/v1/charities/uk/{collection}"].get.parameters[];
      .name == "collection" and
      (.schema.enum | index("tax-rules")) != null and
      (.schema.enum | index("official-procedures")) != null) and
    (["taxTreatmentId", "taxpayerClass", "taxType", "ruleRole", "explanationScope", "procedureType", "procedureStage", "performedByRole", "challengeMode", "taxRuleId"]
      - [.paths["/v1/charities/uk/{collection}"].get.parameters[].name] | length) == 0' >/dev/null

charity_recognition_path='/v1/charities/uk/tax-treatments/tax-hmrc-recognition/why-graph'
charity_analysis_path='/v1/charities/uk/tax-treatments/tax-public-benefit-bargain-analysis/why-graph'
if [ "${publication_status}" = 'open' ]; then
  expected_charity_version=$(jq --raw-output \
    '[.[] | select(.datasetId == "uk-charities-sector")][-1].version' \
    api/src/release-checkpoints.json)
  expected_charity_digest=$(jq --raw-output \
    '[.[] | select(.datasetId == "uk-charities-sector")][-1].digest' \
    api/src/release-checkpoints.json)
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    https://api.taxsorted.io/v1/charities/uk/manifest | \
    jq --exit-status \
      --arg version "${expected_charity_version}" \
      --arg digest "${expected_charity_digest}" '
        .schema == "taxsorted.uk.charities/3" and
        .version == $version and
        .datasetHash == $digest and
        .publication.status == "open" and
        .publication.fullCorpusAvailable == true and
        .counts.sources == 132 and
        .counts.regulators == 8 and
        .counts["tax-rules"] == 47 and
        .counts["official-procedures"] == 35 and
        .counts.gaps == 22
      ' >/dev/null
  for specification in \
    "${charity_recognition_path}|source-reported-claim" \
    "${charity_analysis_path}|taxsorted-analysis"
  do
    graph_path=${specification%%|*}
    expected_authority=${specification##*|}
    graph_name=$(basename "$(dirname "${graph_path}")")
    graph_headers="${RUNNER_TEMP}/${graph_name}.why-graph.headers"
    graph_body="${RUNNER_TEMP}/${graph_name}.why-graph.json"
    curl --fail --silent --show-error \
      --connect-timeout 10 --max-time 30 \
      --header 'Origin: https://builder.example' \
      --dump-header "${graph_headers}" --output "${graph_body}" \
      "https://api.taxsorted.io${graph_path}"
    jq --exit-status --arg authority "${expected_authority}" '
      .rootNodeId as $root |
      .schema == "taxsorted.why-graph/1" and
      .context.authority == $authority and
      .context.effect == "advisory" and
      .context.externalStateChange == false and
      .context.subject.type == "dataset-record" and
      .context.subject.version == "2026-07-13.2" and
      .valueHandling.factValues == "case-financial-and-identity-fact-values-not-copied-into-graph" and
      .nodes[0].id <= .nodes[-1].id and
      ([
        "gap:binding-provision-not-mapped",
        "gap:case-applicability-not-assessed",
        "gap:case-enforcement-and-challenge-not-mapped"
      ] - .coverage.gapNodeIds | length) == 0 and
      ([.nodes[] | select(.kind == "rule")] | length) == 0 and
      all(.nodes[]; (.record == null) or (.record.kind != "response-record")) and
      ([.edges[] | select(.relation == "legal-authority-from")] | length) == 0 and
      ((.nodes[] | select(.id == $root) | .record) as $record |
        $record.dataset == "uk-charities-sector" and
        $record.collection == "taxTreatments")
    ' "${graph_body}" >/dev/null
    awk 'tolower($1) == "x-schema-version:" { gsub("\r", "", $2); found = ($2 == "taxsorted.why-graph/1") } END { exit !found }' \
      "${graph_headers}"
    awk 'tolower($1) == "x-taxsorted-why-graph-adopter:" { gsub("\r", "", $2); found = ($2 == "uk.charities.tax-treatment") } END { exit !found }' \
      "${graph_headers}"
    awk 'tolower($1) == "access-control-allow-origin:" { gsub("\r", "", $2); found = ($2 == "*") } END { exit !found }' \
      "${graph_headers}"
    awk 'tolower($1) == "access-control-expose-headers:" && index(tolower($0), "x-taxsorted-why-graph-adopter") { found = 1 } END { exit !found }' \
      "${graph_headers}"
    if grep --ignore-case '^set-cookie:' "${graph_headers}" >/dev/null; then
      echo "Charity why graph set a cookie: ${graph_path}" >&2
      exit 1
    fi

    jq --raw-output '
      .nodes[] |
      select(.kind == "source" and .record.kind == "dataset-record") |
      .record.href
    ' "${graph_body}" | while IFS= read -r source_href; do
      curl --fail --silent --show-error \
        --connect-timeout 10 --max-time 30 \
        "https://api.taxsorted.io${source_href}" | \
        jq --exit-status '
          .data.status == "current" and
          .data.reuseStatus == "confirmed" and
          .data.publicationMode == "normalised-summary" and
          .data.reviewAfter >= "2026-07-12"
        ' >/dev/null
    done
  done

  charity_nce_path='/v1/charities/uk/tax-treatments/tax-non-charitable-expenditure/why-graph'
  charity_nce_graph="${RUNNER_TEMP}/tax-non-charitable-expenditure.why-graph.json"
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --output "${charity_nce_graph}" \
    "https://api.taxsorted.io${charity_nce_path}"
  jq --exit-status '
    .context.subject.version == "2026-07-13.2" and
    ([
      "gap:binding-provision-coverage-incomplete",
      "gap:case-applicability-not-assessed",
      "gap:case-enforcement-and-challenge-not-mapped",
      "gap:dataset:gap-non-charitable-expenditure-law-and-procedure-coverage"
    ] - .coverage.gapNodeIds | length) == 0 and
    ([.nodes[] | select(.kind == "rule")] | length) == 16 and
    all(.nodes[] | select(.kind == "rule");
      .state == "checked-not-decisive" and
      .record.kind == "dataset-record" and
      .record.collection == "taxRules") and
    ([.nodes[] | select(.kind == "process")] | length) == 0 and
    ([.edges[] | select(.relation == "legal-authority-from")] | length) == 16 and
    ([.edges[] | select(.relation == "administered-by")] | length) == 16 and
    ([.edges[] | select(.relation == "considers-rule")] | length) > 0 and
    ([.edges[] | select(.relation == "applies-rule" or .relation == "enforced-through")] | length) == 0
  ' "${charity_nce_graph}" >/dev/null

  jq --raw-output '
    .nodes[] |
    select(.kind == "source" and .record.kind == "dataset-record") |
    select(.record.recordId | startswith("src-ita-2007-s") or startswith("src-cta-2010-s")) |
    .record.href
  ' "${charity_nce_graph}" | while IFS= read -r law_href; do
    curl --fail --silent --show-error \
      --connect-timeout 10 --max-time 30 \
      "https://api.taxsorted.io${law_href}" | \
      jq --exit-status '
        .data.authorityLevel == "primary-law" and
        .data.status == "current" and
        .data.reuseStatus == "confirmed" and
        .data.publicationMode == "metadata-only" and
        (.data.url | test("/(section|regulation|article|rule)/"))
      ' >/dev/null
  done

  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/tax-rules?taxTreatmentId=tax-non-charitable-expenditure&limit=100' | \
    jq --exit-status '
      .page.total >= 47 and
      (.data | length) == .page.total and
      all(.data[];
        .taxTreatmentId == "tax-non-charitable-expenditure" and
        .summaryAuthority == "taxsorted-analysis-of-primary-law" and
        (.taxTypes | length) > 0 and
        (.authoritySelector.kind == "section" or .authoritySelector.kind == "schedule-paragraph"))
    ' >/dev/null
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/official-procedures?limit=100' | \
    jq --exit-status '
      .page.total == 35 and
      (.data | length) == .page.total and
      ([.data[] | select(.taxTreatmentId == "tax-income-and-gains")] | length) == 31 and
      ([.data[] | select(.taxTreatmentId == "tax-non-charitable-expenditure")] | length) == 4 and
      all(.data[];
        .applicability == "conditional-sector-map-case-selection-required" and
        .summaryAuthority == "taxsorted-analysis-of-primary-law" and
        .nextProcedureMeaning == "possible-not-mandatory" and
        (.requiredCaseSelectors | index("taxpayer-class")) != null and
        (.requiredCaseSelectors | index("tax-type")) != null and
        (.requiredCaseSelectors | index("jurisdiction")) != null)
    ' >/dev/null
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/tax-rules?taxType=capital-gains-tax&explanationScope=supplementary-substantive&limit=100' | \
    jq --exit-status '
      .page.total >= 5 and
      all(.data[];
        (.taxTypes | index("capital-gains-tax")) != null and
        .explanationScope == "supplementary-substantive")
    ' >/dev/null
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/tax-rules?taxTreatmentId=tax-income-and-gains&sourceId=src-tcga-1992-s256&limit=100' | \
    jq --exit-status '
      .page.total == 1 and
      .data[0].id == "rule-tcga-1992-s256-charitable-gain-exemption" and
      .data[0].taxTreatmentId == "tax-non-charitable-expenditure" and
      .data[0].relatedTaxTreatmentIds == ["tax-income-and-gains"]
    ' >/dev/null
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/official-procedures?procedureType=tribunal-notification&limit=100' | \
    jq --exit-status '
      .page.total == 3 and
      ([.data[].id] | sort) == [
        "procedure-charity-cross-tax-tma-1970-s49d-direct-tribunal-notification",
        "procedure-charity-cross-tax-tma-1970-s49g-post-review-tribunal-notification",
        "procedure-charity-cross-tax-tma-1970-s49h-unaccepted-review-offer-tribunal-notification"
      ] and
      all(.data[];
        .performedByRoles == ["taxpayer"] and
        .nextProcedureMeaning == "possible-not-mandatory")
    ' >/dev/null
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    'https://api.taxsorted.io/v1/charities/uk/official-procedures?procedureStage=recovery&limit=100' | \
    jq --exit-status '
      .page.total == 3 and
      ([.data[].procedureType] | sort) == ["distraint-recovery", "summary-warrant-recovery", "taking-control-of-goods-recovery"] and
      ([.data[].jurisdictions[]] | index("Scotland")) != null and
      ([.data[].jurisdictions[]] | index("Northern Ireland")) != null and
      all(.data[]; .nextProcedureMeaning == "possible-not-mandatory")
    ' >/dev/null

  jq --exit-status '
    .coverage.gapNodeIds | index("gap:dataset:gap-public-benefit-analysis-territory") != null
  ' "${RUNNER_TEMP}/tax-public-benefit-bargain-analysis.why-graph.json" >/dev/null

  charity_head_headers="${RUNNER_TEMP}/charity-why-graph-head.headers"
  curl --fail --silent --show-error --head \
    --connect-timeout 10 --max-time 30 \
    --dump-header "${charity_head_headers}" --output /dev/null \
    "https://api.taxsorted.io${charity_recognition_path}"
  charity_etag=$(awk 'tolower($1) == "etag:" { gsub("\r", "", $2); print $2; exit }' \
    "${charity_head_headers}")
  test -n "${charity_etag}"
  charity_unchanged_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header "If-None-Match: ${charity_etag}" \
    --output /dev/null --write-out '%{http_code}' \
    "https://api.taxsorted.io${charity_recognition_path}")
  test "${charity_unchanged_status}" = '304'

  charity_write_headers="${RUNNER_TEMP}/charity-why-graph-write.headers"
  charity_write_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 --request POST \
    --dump-header "${charity_write_headers}" --output /dev/null \
    --write-out '%{http_code}' \
    "https://api.taxsorted.io${charity_recognition_path}")
  test "${charity_write_status}" = '404'
  awk 'tolower($1) == "cache-control:" { gsub("\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
    "${charity_write_headers}"
else
  known_problem="${RUNNER_TEMP}/charity-why-graph-known-closed.json"
  unknown_problem="${RUNNER_TEMP}/charity-why-graph-unknown-closed.json"
  known_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --output "${known_problem}" --write-out '%{http_code}' \
    "https://api.taxsorted.io${charity_recognition_path}")
  unknown_status=$(curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --output "${unknown_problem}" --write-out '%{http_code}' \
    'https://api.taxsorted.io/v1/charities/uk/tax-treatments/not-a-treatment/why-graph')
  test "${known_status}" = '503'
  test "${unknown_status}" = '503'
  diff --unified \
    <(jq --sort-keys 'del(.instance, .path)' "${known_problem}") \
    <(jq --sort-keys 'del(.instance, .path)' "${unknown_problem}")
fi

wake_body="${RUNNER_TEMP}/wake.json"
wake_headers="${RUNNER_TEMP}/wake.headers"
root_body="${RUNNER_TEMP}/root-wake.json"
root_headers="${RUNNER_TEMP}/root-wake.headers"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --dump-header "${wake_headers}" --output "${wake_body}" \
  https://api.taxsorted.io/v1/wake
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Accept: application/json' \
  --dump-header "${root_headers}" --output "${root_body}" \
  https://api.taxsorted.io/
cmp --silent "${wake_body}" "${root_body}"
jq --exit-status '
  .schema == "taxsorted.agent-wake/1" and
  .resources.charityAccountability.status == "schema-only-not-admitted" and
  .resources.charityAccountability.recordsAvailable == false and
  .resources.observerAccountability.status == "schema-only-not-admitted" and
  .resources.observerAccountability.recordsAvailable == false and
  .resources.corrections.accountRequired == true and
  .resources.corrections.privateOrSensitiveIntakeAvailable == false and
  .resources.openApi.publicHref == "/openapi-public.json" and
  .resources.openApi.datasetSlices.charities == "/openapi/charities-uk.json" and
  .resources.openApi.frameworkSlices.accountability == "/openapi/accountability-uk.json" and
  .resources.openApi.frameworkSlices.taxIdentity == "/openapi/tax-identity-uk.json" and
  .resources.openApi.frameworkSlices.whyGraph == "/openapi/why-graph.json" and
  .resources.openApi.taskSlices.taxExpert == "/openapi/tax-expert-uk.json" and
  .resources.openApi.taskSlices.professionalTools == "/openapi/professional-tools-uk.json" and
  .resources.taxIdentity.href == "/v1/tax-identity/uk" and
  .resources.taxIdentity.graph == "/v1/tax-identity/uk/graph" and
  .resources.taxIdentity.schema == "taxsorted.uk.tax-identity/1" and
  .resources.taxIdentity.schemaHref == "/v1/tax-identity/uk/schema" and
  (.resources.taxIdentity.availability == "open" or
    .resources.taxIdentity.availability == "emergency-stopped") and
  .resources.taxIdentity.boundaries.personalFactsAccepted == false and
  .resources.taxIdentity.boundaries.externalStateChange == false and
  .access.linkedTaskAccessDeclaredSeparately == true and
  .access.methods == ["GET", "HEAD", "OPTIONS"] and
  (.access.appliesTo | index("/v1/uk/tax-expert/mtd-income-tax/assessments") | not) and
  .resources.taxExpert.publicManifest.href == "/v1/uk/tax-expert" and
  .resources.taxExpert.assessment.operationId == "assessMtdIncomeTaxReadiness" and
  .resources.taxExpert.assessment.method == "POST" and
  .resources.taxExpert.assessment.authentication.openApiSecurityScheme == "WorkspaceKey" and
  .resources.taxExpert.assessment.authentication.requiredScope == "tax-expert:assess" and
  .resources.taxExpert.assessment.availability == "credentialed-design-partner" and
  .resources.taxExpert.assessment.publicSelfServiceKeyProvisioning == false and
  .resources.taxExpert.assessment.workspaceKeyIdentifiesWorkspace == true and
  .resources.taxExpert.assessment.requestFactsStorage == "not-written-to-application-storage" and
  .resources.taxExpert.assessment.applicationStateWrite == false and
  .resources.taxExpert.assessment.externalSubmission == false and
  .resources.taxExpert.assessment.intendedClient == "server-to-server" and
  .resources.taxExpert.assessment.browserCors == "not-supported-for-bearer-assessment" and
  .resources.taxExpert.assessment.browserCorsAuthorizationHeaderAllowed == false and
  .resources.taxExpert.assessment.idempotency == "not-declared" and
  .resources.taxExpert.assessment.idempotencyMeaning == "no-Idempotency-Key-protocol; duplicate-calls-have-no-state-effect" and
  .resources.taxExpert.assessment.retry.applicationOrExternalStateChange == false and
  .resources.taxExpert.assessment.retry.duplicateRequestStateEffect == "none" and
  .resources.taxExpert.assessment.retry.byteStabilityGuaranteedAcrossTime == false and
  .resources.taxExpert.assessment.errorContract.requestFactValuesEchoedInErrors == false and
  .resources.professionalTools.publicManifest.href == "/v1/uk/professional-tools" and
  .resources.professionalTools.taskContract.href == "/openapi/professional-tools-uk.json" and
  .resources.professionalTools.credentialInspection.href == "/v1/api-workspace" and
  .resources.professionalTools.credentialInspection.authentication == "Bearer TaxSorted workspace key" and
  .resources.professionalTools.credentialInspection.requiredWorkspaceScopes == [] and
  .resources.professionalTools.credentialInspection.intendedClient == "server-to-server" and
  .resources.professionalTools.credentialInspection.browserCorsAuthorizationHeaderAllowed == false and
  .resources.professionalTools.credentialInspection.acceptsQueryParameters == false and
  .resources.professionalTools.credentialInspection.acceptsRequestBody == false and
  .resources.professionalTools.credentialInspection.acceptsClientFacts == false and
  .resources.professionalTools.credentialInspection.changesState == false and
  .resources.professionalTools.credentialInspection.returnsOtherKeys == false and
  .resources.professionalTools.operatorKeyLifecycle.inspect == true and
  .resources.professionalTools.operatorKeyLifecycle.issueWithFiniteExpiry == true and
  .resources.professionalTools.operatorKeyLifecycle.overlappingRotation == true and
  .resources.professionalTools.operatorKeyLifecycle.explicitRevocation == true and
  .resources.professionalTools.operatorKeyLifecycle.selfService == false and
  .resources.professionalTools.operatorKeyLifecycle.securePublicDelivery == false and
  .resources.professionalTools.operatorKeyLifecycle.authenticatedAdminAuditTrail == false and
  .resources.professionalTools.status == "credentialed-design-partner" and
  .resources.professionalTools.executableTaskCount == 2 and
  .resources.professionalTools.access.availability == "credentialed-design-partner" and
  .resources.professionalTools.access.publicSelfServiceKeyProvisioning == false and
  .resources.professionalTools.access.confidentialAccessRequestIntake == false and
  .resources.professionalTools.access.browserAccountProvidesWorkspaceKey == false and
  .resources.professionalTools.access.workspaceKeyIdentifiesCallingWorkspace == true and
  .resources.professionalTools.access.requestFactsMayBePersonalData == true and
  .resources.professionalTools.boundaries.clientOrMatterRecords == false and
  .resources.professionalTools.boundaries.filingOrSubmission == false and
  .resources.professionalTools.boundaries.immutableEvidenceArchive == false and
  .resources.professionalTools.boundaries.workspaceNameReturnedToCaller == false and
  .resources.whyGraph.framework == "/v1/why-graph" and
  .resources.whyGraph.adopters == "/v1/why-graph/adopters" and
  .resources.whyGraph.schema == "/v1/why-graph/schema" and
  .resources.whyGraph.openApi == "/openapi/why-graph.json" and
  .resources.whyGraph.graphSchema == "taxsorted.why-graph/1" and
  .resources.whyGraph.status == "first-adopter" and
  .resources.whyGraph.adopterCount == 3 and
  .resources.whyGraph.firstAdopter.endpoint == "/v1/uk/tax-expert/mtd-income-tax/assessments" and
  .resources.whyGraph.firstAdopter.responsePath == "/reasoning/whyGraph" and
  .resources.whyGraph.firstAdopter.capabilityVersion == "2026-07-11.5" and
  .resources.whyGraph.firstAdopter.runtimeEmitted == true and
  .resources.whyGraph.firstAdopter.wireSchemaOptionalForForwardCompatibleV1Readers == true and
  .resources.whyGraph.secondAdopter.endpointTemplate == "/v1/charities/uk/tax-treatments/{id}/why-graph" and
  .resources.whyGraph.secondAdopter.subjectVersion == "2026-07-13.2" and
  .resources.whyGraph.secondAdopter.runtimeEmitted == true and
  .resources.whyGraph.secondAdopter.organisationOrCaseFacts == false and
  .resources.whyGraph.thirdAdopter.endpointTemplate == "/v1/case-commons/uk/cases/{caseId}/why-graph" and
  .resources.whyGraph.thirdAdopter.subjectVersion == "2026-07-24.1" and
  .resources.whyGraph.thirdAdopter.runtimeEmitted ==
    (.resources.caseCommons.interpretationAvailability == "exact-release-verified-on-request") and
  .resources.whyGraph.thirdAdopter.standaloneResource == true and
  .resources.whyGraph.thirdAdopter.publicationControlledBy == "/v1/case-commons/uk plus the exact tax-dispute derived-release approval" and
  .resources.whyGraph.thirdAdopter.sourceScope == "approved-public-packets-plus-taxsorted-derived-labels" and
  .resources.whyGraph.thirdAdopter.concisePublicReasonsOnly == true and
  .resources.whyGraph.thirdAdopter.hiddenChainOfThought == false and
  .resources.whyGraph.thirdAdopter.runtimeOrPrivateAssessmentsUsedForTraining == false and
  .resources.whyGraph.access.appliesTo == ["/v1/why-graph", "/v1/why-graph/adopters", "/v1/why-graph/schema"] and
  .resources.whyGraph.access.methods == ["GET", "HEAD", "OPTIONS"] and
  .resources.whyGraph.access.authentication == "none" and
  .resources.whyGraph.access.writes == "none" and
  .resources.whyGraph.boundaries.createsGraphRecords == false and
  .resources.whyGraph.boundaries.changesExternalState == false and
  .resources.whyGraph.boundaries.infersOfficialAppealRights == false and
  .resources.whyGraph.boundaries.graphIsDerivedNotCanonical == true and
  (.nextActions | any(.id == "inspect-why-graph-contract" and .href == "/v1/why-graph")) and
  (.nextActions | any(.id == "inspect-why-graph-adopters" and .href == "/v1/why-graph/adopters")) and
  (.nextActions | any(.id == "inspect-professional-tools" and .href == "/v1/uk/professional-tools")) and
  .resources.releases.ledger == "/v1/open-data/releases" and
  .resources.releases.jsonFeed == "/v1/open-data/releases/feed.json" and
  .resources.releases.atom == "/v1/open-data/releases/feed.atom" and
  .attribution.conformanceClaim == "none"
' "${wake_body}" >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/uk/professional-tools | \
  jq --exit-status '
    .schema == "taxsorted.uk.professional-tools/1" and
    .status == "credentialed-design-partner" and
    .access.publicSelfServiceKeyProvisioning == false and
    .access.confidentialAccessRequestIntake == false and
    .access.workspaceKeyIdentifiesCallingWorkspace == true and
    .access.requestFactsMayBePersonalData == true and
    .access.credentialInspection.href == "/v1/api-workspace" and
    .access.credentialInspection.requiredWorkspaceScopes == [] and
    .access.credentialInspection.intendedClient == "server-to-server" and
    .access.credentialInspection.browserCorsAuthorizationHeaderAllowed == false and
    .access.credentialInspection.acceptsQueryParameters == false and
    .access.credentialInspection.acceptsRequestBody == false and
    .access.credentialInspection.acceptsClientFacts == false and
    .access.credentialInspection.changesState == false and
    .practiceRecord.applicationStoresRequestsOrResults == false and
    .practiceRecord.immutableEvidenceArchiveAvailable == false and
    .keyLifecycle.operatorManaged == true and
    .keyLifecycle.issueExistingWorkspace == true and
    .keyLifecycle.overlappingRotation == true and
    .keyLifecycle.explicitRevocation == true and
    .keyLifecycle.newKeysRequireFiniteExpiry == true and
    .keyLifecycle.selfService == false and
    .keyLifecycle.securePublicDeliveryAvailable == false and
    .keyLifecycle.authenticatedAdminAuditTrailAvailable == false and
    .boundaries.clientOrMatterRecords == false and
    .boundaries.filingOrSubmission == false and
    .boundaries.publishedRateLimitContract == false and
    .boundaries.publishedProfessionalPrivacyAndRetentionPolicy == false and
    .boundaries.publishedSecurityAssessment == false and
    .boundaries.selfServiceKeyRotationOrRevocation == false and
    .boundaries.publishedHighAvailabilityContract == false and
    (.tasks | length) == 2 and
    (.tasks | any(.operationId == "calculateResidentialSdlt" and .requiredScope == "sdlt:calculate")) and
    (.tasks | any(.operationId == "assessMtdIncomeTaxReadiness" and .requiredScope == "tax-expert:assess"))
  ' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/uk/tax-expert | \
  jq --exit-status '
    .schema == "taxsorted.uk.tax-expert/1" and
    (.capabilities | any(.id == "uk.mtd-income-tax.readiness" and .status == "available"))
  ' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/openapi/why-graph.json | \
  jq --exit-status '
    .openapi == "3.1.0" and
    .["x-taxsorted-slice"].id == "why-graph" and
    .["x-taxsorted-shared-components"] == ["#/components/schemas/WhyGraph"] and
    (.paths | keys | sort) == [
      "/v1/why-graph",
      "/v1/why-graph/adopters",
      "/v1/why-graph/schema"
    ] and
    ([.paths[] | (keys | sort)] | all(. == ["get", "head"])) and
    .paths["/v1/why-graph"].get.security == [] and
    .paths["/v1/why-graph"].head.security == [] and
    .paths["/v1/why-graph/adopters"].get.security == [] and
    .paths["/v1/why-graph/adopters"].head.security == [] and
    .paths["/v1/why-graph/schema"].get.security == [] and
    .paths["/v1/why-graph/schema"].head.security == [] and
    .components.schemas.WhyGraph.additionalProperties == false and
    .components.schemas.WhyGraph.properties.nodes.minItems == 1 and
    .components.schemas.WhyGraph.properties.nodes.maxItems == 250 and
    .components.schemas.WhyGraph.properties.edges.maxItems == 1000' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/openapi/professional-tools-uk.json | \
  jq --exit-status '
    .openapi == "3.1.0" and
    .["x-taxsorted-slice"].id == "professional-tools-uk" and
    (.paths | keys | sort) == [
      "/v1/api-workspace",
      "/v1/uk/professional-tools",
      "/v1/uk/sdlt/calculations",
      "/v1/uk/tax-expert",
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
      "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
      "/v1/uk/tax-expert/tax-position-passport/schema"
    ] and
    .paths["/v1/api-workspace"].get.operationId == "inspectAuthenticatedApiWorkspace" and
    .paths["/v1/api-workspace"].get.security == [{"WorkspaceKey": []}] and
    .paths["/v1/api-workspace"].get["x-taxsorted-required-workspace-scopes"] == [] and
    (.paths["/v1/api-workspace"].get | has("parameters") | not) and
    (.paths["/v1/api-workspace"].get | has("requestBody") | not) and
    (.paths["/v1/api-workspace"].get.responses | has("400")) and
    (.paths["/v1/api-workspace"].get.responses | has("403") | not) and
    .paths["/v1/api-workspace"].get.responses["200"].headers["Cache-Control"].schema.enum == ["no-store"] and
    .components.schemas.ApiWorkspaceResponse.additionalProperties == false and
    (.components.schemas.ApiWorkspaceResponse.properties.workspace.properties | keys) == ["id"] and
    (.components.schemas.ApiWorkspaceResponse.properties.presentedKey.properties | keys | sort) == ["createdAt", "expiresAt", "id", "mode", "prefix", "scopes"] and
    .paths["/v1/uk/professional-tools"].get.security == [] and
    .paths["/v1/uk/sdlt/calculations"].post.security == [{"WorkspaceKey": []}] and
    .paths["/v1/uk/sdlt/calculations"].post["x-taxsorted-required-workspace-scopes"] == ["sdlt:calculate"] and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post["x-taxsorted-required-workspace-scopes"] == ["tax-expert:assess"] and
    .paths["/v1/uk/sdlt/calculations"].post.requestBody.content["application/json"].example.effectiveDate == "2026-07-10" and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post.requestBody.content["application/json"].example.schema == "taxsorted.uk.mtd-income-tax.request/1" and
    .components.securitySchemes.WorkspaceKey.scheme == "bearer"
  ' >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/openapi/tax-expert-uk.json | \
  jq --exit-status '
    .openapi == "3.1.0" and
    (.paths | keys | sort) == [
      "/v1/uk/tax-expert",
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
      "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
      "/v1/uk/tax-expert/tax-position-passport/schema"
    ] and
    .paths["/v1/uk/tax-expert"].get.security == [] and
    .paths["/v1/uk/tax-expert/tax-position-passport/schema"].get.operationId == "getTaxPositionPassportSchema" and
    .paths["/v1/uk/tax-expert/tax-position-passport/schema"].get.security == [] and
    .paths["/v1/uk/tax-expert/tax-position-passport/schema"].get.responses["200"].content["application/schema+json"].schema["$ref"] == "#/components/schemas/TaxPositionPassportJsonSchema" and
    .paths["/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax"].get.operationId == "getTaxPositionPassportMtdExample" and
    .paths["/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax"].get.security == [] and
    .paths["/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax"].get.responses["200"].content["application/json"].schema["$ref"] == "#/components/schemas/TaxPositionPassportExample" and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post.operationId == "assessMtdIncomeTaxReadiness" and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post.security == [{"WorkspaceKey": []}] and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post["x-taxsorted-required-workspace-scopes"] == ["tax-expert:assess"] and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post["x-taxsorted-why-graph"] == {
      "schema": "taxsorted.why-graph/1",
      "responseJsonPointer": "/reasoning/whyGraph",
      "scope": "reached-result-trace-not-complete-law-map",
      "currentlyEmitted": true
    } and
    .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post.requestBody.required == true and
    .components.schemas.MtdIncomeTaxAssessmentResponse.properties.reasoning.properties.whyGraph["$ref"] == "#/components/schemas/WhyGraph" and
    ((.components.schemas.MtdIncomeTaxAssessmentResponse.properties.reasoning.required | index("whyGraph")) | not) and
    .components.securitySchemes.WorkspaceKey.type == "http" and
    .components.securitySchemes.WorkspaceKey.scheme == "bearer"
  ' >/dev/null

workspace_unauthenticated_headers="${RUNNER_TEMP}/api-workspace-unauthenticated.headers"
workspace_unauthenticated_body="${RUNNER_TEMP}/api-workspace-unauthenticated.json"
workspace_unauthenticated_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --dump-header "${workspace_unauthenticated_headers}" \
  --output "${workspace_unauthenticated_body}" \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/api-workspace)
test "${workspace_unauthenticated_status}" = "401"
jq --exit-status '
  .error == "invalid_api_key" and
  (has("requiredScope") | not) and
  (.nextActions | length) >= 2
' "${workspace_unauthenticated_body}" >/dev/null
grep --ignore-case --fixed-strings \
  'www-authenticate: Bearer realm="TaxSorted API", error="invalid_token"' \
  "${workspace_unauthenticated_headers}" >/dev/null

workspace_query_marker='workspace-query-canary-do-not-echo'
workspace_query_headers="${RUNNER_TEMP}/api-workspace-query.headers"
workspace_query_body="${RUNNER_TEMP}/api-workspace-query.json"
workspace_query_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --dump-header "${workspace_query_headers}" \
  --output "${workspace_query_body}" \
  --write-out '%{http_code}' \
  "https://api.taxsorted.io/v1/api-workspace?clientFact=${workspace_query_marker}")
test "${workspace_query_status}" = "400"
jq --exit-status '.error == "query_not_allowed"' \
  "${workspace_query_body}" >/dev/null
if grep --fixed-strings "${workspace_query_marker}" "${workspace_query_body}" >/dev/null; then
  echo 'API workspace query rejection reflected a supplied value.' >&2
  exit 1
fi

workspace_body_marker='workspace-body-canary-do-not-echo'
workspace_declared_body_headers="${RUNNER_TEMP}/api-workspace-declared-body.headers"
workspace_declared_body="${RUNNER_TEMP}/api-workspace-declared-body.json"
workspace_declared_body_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request GET \
  --header 'Content-Type: text/plain' \
  --data-binary "${workspace_body_marker}" \
  --dump-header "${workspace_declared_body_headers}" \
  --output "${workspace_declared_body}" \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/api-workspace)
test "${workspace_declared_body_status}" = "400"
jq --exit-status '.error == "request_body_not_allowed"' \
  "${workspace_declared_body}" >/dev/null
if grep --fixed-strings "${workspace_body_marker}" "${workspace_declared_body}" >/dev/null; then
  echo 'API workspace body rejection reflected a supplied value.' >&2
  exit 1
fi

for workspace_boundary_headers in \
  "${workspace_unauthenticated_headers}" \
  "${workspace_query_headers}" \
  "${workspace_declared_body_headers}"; do
  awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
    "${workspace_boundary_headers}"
  if grep --ignore-case '^set-cookie:' "${workspace_boundary_headers}" >/dev/null; then
    echo 'API workspace boundary response set a browser cookie.' >&2
    exit 1
  fi
done

workspace_canary_headers="${RUNNER_TEMP}/api-workspace-canary.headers"
workspace_canary_body="${RUNNER_TEMP}/api-workspace-canary.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header "Authorization: Bearer ${TAX_EXPERT_CANARY_API_KEY}" \
  --dump-header "${workspace_canary_headers}" \
  --output "${workspace_canary_body}" \
  https://api.taxsorted.io/v1/api-workspace
awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
  "${workspace_canary_headers}"
awk 'tolower($1) == "x-request-id:" { gsub("\\r", "", $2); found = ($2 ~ /^[0-9a-f-]{36}$/) } END { exit !found }' \
  "${workspace_canary_headers}"
if grep --ignore-case '^set-cookie:' "${workspace_canary_headers}" >/dev/null; then
  echo 'Authenticated API workspace canary set a browser cookie.' >&2
  exit 1
fi
if grep --fixed-strings "${TAX_EXPERT_CANARY_API_KEY}" "${workspace_canary_body}" >/dev/null; then
  echo 'Authenticated API workspace canary reflected its secret.' >&2
  exit 1
fi
workspace_expected_prefix="${TAX_EXPERT_CANARY_API_KEY:0:16}"
jq --exit-status --arg expectedPrefix "${workspace_expected_prefix}" '
  .schema == "taxsorted.api-workspace/1" and
  (.evaluatedAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T")) and
  (.workspace | keys) == ["id"] and
  (.workspace.id | test("^[0-9a-f-]{36}$")) and
  (.presentedKey | keys | sort) == ["createdAt", "expiresAt", "id", "mode", "prefix", "scopes"] and
  .presentedKey.mode == "test" and
  .presentedKey.prefix == $expectedPrefix and
  (.presentedKey.scopes | sort) == ["sdlt:calculate", "tax-expert:assess"] and
  (.presentedKey.expiresAt | type) == "string" and
  (.capabilities | length) == 2 and
  ([.capabilities[].id] | sort) == ["mtd-income-tax-readiness", "residential-sdlt-calculation"] and
  ([.capabilities[].authorized] | all(. == true)) and
  .boundaries.acceptsClientFacts == false and
  .boundaries.acceptsQueryParameters == false and
  .boundaries.acceptsRequestBody == false and
  .boundaries.storesClientFacts == false and
  .boundaries.revealsOtherKeys == false and
  .boundaries.workspaceNameReturned == false and
  .boundaries.keyNameReturned == false and
  .boundaries.keyHashReturned == false and
  .boundaries.revocationHistoryReturned == false and
  .boundaries.browserAccountLinked == false and
  .boundaries.hmrcConnectionLinked == false and
  .boundaries.intendedClient == "server-to-server" and
  .boundaries.browserCorsAuthorizationHeaderAllowed == false and
  .boundaries.mutatesWorkspaceOrKey == false and
  (.boundaries | keys | sort) == ["acceptsClientFacts", "acceptsQueryParameters", "acceptsRequestBody", "browserAccountLinked", "browserCorsAuthorizationHeaderAllowed", "hmrcConnectionLinked", "intendedClient", "keyHashReturned", "keyNameReturned", "mutatesWorkspaceOrKey", "revealsOtherKeys", "revocationHistoryReturned", "statement", "storesClientFacts", "workspaceNameReturned"] and
  (keys | sort) == ["boundaries", "capabilities", "evaluatedAt", "presentedKey", "schema", "workspace"]
' "${workspace_canary_body}" >/dev/null

expert_headers="${RUNNER_TEMP}/tax-expert-unauthenticated.headers"
expert_body="${RUNNER_TEMP}/tax-expert-unauthenticated.json"
expert_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{}' \
  --dump-header "${expert_headers}" --output "${expert_body}" \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments)
test "${expert_status}" = '401'
awk 'tolower($1) == "www-authenticate:" { found = (tolower($2) == "bearer") } END { exit !found }' \
  "${expert_headers}"
awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
  "${expert_headers}"
awk 'tolower($1) == "content-type:" { found = (tolower($2) ~ /^application\/json/) } END { exit !found }' \
  "${expert_headers}"
jq --exit-status '
  .error == "invalid_api_key" and
  .requiredScope == "tax-expert:assess" and
  .access.publicSelfServiceKeyProvisioning == false and
  .access.confidentialAccessRequestIntake == false and
  (.nextActions | any(.id == "inspect-professional-tools" and .href == "/v1/uk/professional-tools")) and
  (.nextActions | any(.id == "inspect-professional-openapi" and .href == "/openapi/professional-tools-uk.json")) and
  (.requestId | type == "string")
' "${expert_body}" >/dev/null

sdlt_canary_request="${RUNNER_TEMP}/sdlt-canary-request.json"
sdlt_canary_headers="${RUNNER_TEMP}/sdlt-canary.headers"
sdlt_canary_body="${RUNNER_TEMP}/sdlt-canary.json"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/openapi/professional-tools-uk.json | \
  jq --exit-status \
    '.paths["/v1/uk/sdlt/calculations"].post.requestBody.content["application/json"].example' \
    >"${sdlt_canary_request}"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${TAX_EXPERT_CANARY_API_KEY}" \
  --header 'Content-Type: application/json' \
  --data-binary "@${sdlt_canary_request}" \
  --dump-header "${sdlt_canary_headers}" \
  --output "${sdlt_canary_body}" \
  https://api.taxsorted.io/v1/uk/sdlt/calculations
awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
  "${sdlt_canary_headers}"
if grep --ignore-case '^set-cookie:' "${sdlt_canary_headers}" >/dev/null; then
  echo 'Authenticated SDLT canary set a browser cookie.' >&2
  exit 1
fi
jq --exit-status '
  .status == "calculated" and
  .calculation.taxDuePence == 475000 and
  .trust.method == "deterministic" and
  (.trust.requestHash | test("^sha256:[0-9a-f]{64}$")) and
  (.trust.evaluatedOn | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) and
  (.trust.ruleset.revision | type == "string" and length > 0) and
  (.trust.sources | length > 0)
' "${sdlt_canary_body}" >/dev/null

expert_canary_request="${RUNNER_TEMP}/tax-expert-canary-request.json"
expert_canary_headers="${RUNNER_TEMP}/tax-expert-canary.headers"
expert_canary_body="${RUNNER_TEMP}/tax-expert-canary.json"
jq --null-input '
  {
    schema: "taxsorted.uk.mtd-income-tax.request/1",
    asOfDate: "2026-07-12",
    person: {
      relevantReturnPosition: "required-and-submitted",
      hadNationalInsuranceNumberAtStartOf2026To27: true
    },
    income: {
      taxYears: {
        "2024-25": {
          basis: "submitted-return",
          residence: "uk-resident",
          selfEmploymentGrossPence: 5000001,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0
        },
        "2025-26": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0
        },
        "2026-27": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0
        }
      },
      atLeastOneRelevantReturnActivityContinuedAtEntry: true,
      lastRelevantActivityCessationDate: "at-least-one-continues",
      relevantReturnWasAmended: false,
      annualisationOrOtherSpecialRulesMayApply: false
    },
    exemption: {
      returnIndicators: [],
      digitalExclusion: "not-approved-or-pending",
      otherExemptionApplication: "none"
    },
    reporting: { updatePeriod: "standard" }
  }
' >"${expert_canary_request}"
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${TAX_EXPERT_CANARY_API_KEY}" \
  --header 'Content-Type: application/json' \
  --data-binary "@${expert_canary_request}" \
  --dump-header "${expert_canary_headers}" \
  --output "${expert_canary_body}" \
  https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments
awk 'tolower($1) == "cache-control:" { gsub("\\r", "", $2); found = ($2 == "no-store") } END { exit !found }' \
  "${expert_canary_headers}"
if grep --ignore-case '^set-cookie:' "${expert_canary_headers}" >/dev/null; then
  echo 'Authenticated tax-expert canary set a browser cookie.' >&2
  exit 1
fi
# Fresh admitted sources produce the determined rule graph. Once their
# review date passes, the engine must fail closed with the exact
# source-review gap graph. Any other outcome still stops the release.
jq --exit-status '
  .applicability.evaluatedOn as $evaluatedOn |
  .schema == "taxsorted.tax-answer/1" and
  .reasoning.whyGraph.schema == "taxsorted.why-graph/1" and
  .reasoning.whyGraph.rootNodeId == "conclusion:mtd-income-tax-readiness" and
  .reasoning.whyGraph.context.subject == {
    id: "uk.mtd-income-tax.readiness",
    type: "assessment",
    version: "2026-07-11.5"
  } and
  .reasoning.whyGraph.context.effect == "advisory" and
  .reasoning.whyGraph.context.externalStateChange == false and
  .reasoning.whyGraph.valueHandling.factValues == "case-financial-and-identity-fact-values-not-copied-into-graph" and
  (
    (
      .status == "determined" and
      .answer.decision == "in_scope" and
      .applicability.covered == true and
      ([.evidence.sources[] | select(.reviewDueOn < $evaluatedOn)] | length) == 0 and
      ([.reasoning.whyGraph.nodes[] | select(.kind == "rule")] | length) > 0 and
      ([.reasoning.whyGraph.edges[] | select(.relation == "legal-authority-from")] | length) > 0
    ) or
    (
      .status == "needs_professional_review" and
      .answer.decision == "source_review_required" and
      .answer.reasonCodes == ["SOURCE_REVIEW_OVERDUE"] and
      .applicability.covered == false and
      ([.evidence.sources[] | select(.reviewDueOn < $evaluatedOn)] | length) > 0 and
      .escalation.required == true and
      .escalation.reasonCodes == ["SOURCE_REVIEW_OVERDUE"] and
      (.escalation.nextActions | length) == 1 and
      .escalation.nextActions[0].id == "refresh-sources" and
      .escalation.nextActions[0].responsibleParty == "TaxSorted" and
      ([.reasoning.whyGraph.nodes[] | select(.kind == "rule")] | length) == 0 and
      ([.reasoning.whyGraph.edges[] | select(.relation == "legal-authority-from")] | length) == 0 and
      (.reasoning.whyGraph.coverage.gapNodeIds | index("gap:source_review_overdue") != null) and
      ([.reasoning.whyGraph.edges[] | select(
        .from == "conclusion:mtd-income-tax-readiness" and
        .relation == "blocked-by" and
        .to == "gap:source_review_overdue"
      )] | length) == 1 and
      ([.reasoning.whyGraph.edges[] | select(
        .from == "gap:source_review_overdue" and
        .relation == "supported-by"
      )] | length) ==
        ([.evidence.sources[] | select(.reviewDueOn < $evaluatedOn)] | length)
    )
  ) and
  (.reasoning.whyGraph.coverage.gapNodeIds | index("gap:official-enforcement-and-review-route") != null) and
  .dataUse.stored == false and
  .dataUse.usedForTraining == false
' "${expert_canary_body}" >/dev/null
expert_cors_headers="${RUNNER_TEMP}/tax-expert-cors.headers"
expert_cors_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request OPTIONS \
  --header 'Origin: https://untrusted.example' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: authorization,content-type' \
  --dump-header "${expert_cors_headers}" --output /dev/null \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments)
test "${expert_cors_status}" = '204'
if grep --ignore-case '^access-control-allow-origin:' \
  "${expert_cors_headers}" >/dev/null
then
  echo 'Tax-expert assessment exposed an untrusted browser origin.' >&2
  exit 1
fi
expert_configured_cors_headers="${RUNNER_TEMP}/tax-expert-configured-cors.headers"
expert_configured_cors_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request OPTIONS \
  --header 'Origin: https://taxsorted.io' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: authorization,content-type' \
  --dump-header "${expert_configured_cors_headers}" --output /dev/null \
  --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments)
test "${expert_configured_cors_status}" = '204'
awk 'tolower($1) == "access-control-allow-origin:" { gsub("\\r", "", $2); found = ($2 == "https://taxsorted.io") } END { exit !found }' \
  "${expert_configured_cors_headers}"
if awk 'tolower($1) == "access-control-allow-headers:" && index(tolower($0), "authorization") { found = 1 } END { exit !found }' \
  "${expert_configured_cors_headers}"
then
  echo 'Tax-expert browser CORS unexpectedly allowed the bearer Authorization header.' >&2
  exit 1
fi
wake_etag=$(awk 'tolower($1) == "etag:" { gsub("\\r", "", $2); print $2; exit }' "${wake_headers}")
root_etag=$(awk 'tolower($1) == "etag:" { gsub("\\r", "", $2); print $2; exit }' "${root_headers}")
test -n "${wake_etag}"
test "${wake_etag}" = "${root_etag}"
awk 'tolower($1) == "content-location:" { gsub("\\r", "", $2); found = ($2 == "/v1/wake") } END { exit !found }' \
  "${root_headers}"
bare_root_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --output /dev/null --write-out '%{http_code}' \
  https://api.taxsorted.io/)
test "${bare_root_status}" = '404'

problem_headers="${RUNNER_TEMP}/problem.headers"
problem_body="${RUNNER_TEMP}/problem.json"
problem_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header 'Accept: application/problem+json' \
  --dump-header "${problem_headers}" --output "${problem_body}" \
  --write-out '%{http_code}' \
  'https://api.taxsorted.io/v1/open-data?secret=must-not-be-reflected')
test "${problem_status}" = '400'
awk 'tolower($1) == "content-type:" { found = (tolower($2) ~ /^application\/problem\+json/) } END { exit !found }' \
  "${problem_headers}"
jq --exit-status '
  .type == "https://api.taxsorted.io/problems/unknown_query_parameter" and
  .status == 400 and
  .instance == "/v1/open-data" and
  .parameters == ["secret"] and
  ((tostring | contains("must-not-be-reflected")) | not)
' "${problem_body}" >/dev/null

public_funding_status=$(curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  https://api.taxsorted.io/v1/public-funding/uk | \
  jq --raw-output '.manifest.publicationStatus')
public_funding_graph_status=$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --output /dev/null --write-out '%{http_code}' \
  https://api.taxsorted.io/v1/public-funding/uk/graph)
case "${public_funding_status}:${public_funding_graph_status}" in
  open:200|publication-review:503|emergency-stopped:503) ;;
  *)
    echo "Public-funding publication and graph disagree: ${public_funding_status}:${public_funding_graph_status}" >&2
    exit 1
    ;;
esac
