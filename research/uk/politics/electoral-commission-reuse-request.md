# Electoral Commission — Political Finance Online reuse request

**Status:** draft; not sent
**Official contact route:** <https://www.electoralcommission.org.uk/contact-us>

## Subject

Please confirm reuse and attribution terms for Political Finance Online data

## Draft

Hello,

I am building TaxSorted.io, a free and open-source public-interest service that
helps people understand UK tax and politics through sourced official records.

We would like to make a read-only, attributed view of reportable political-party
donations published in Political Finance Online. The service would:

- show the Electoral Commission as the publisher and link every result to the
  official search;
- retrieve only the fields needed to explain the reported transaction: reference,
  recipient, amount, accepted/received/reported dates, donor name and type,
  donation type/nature, reporting period and register;
- omit donor addresses, postcodes, company numbers and internal database IDs;
- use bounded date windows, cache responses and respect rate limits;
- make the normalized result available through a free, read-only JSON API;
- state clearly that a declared donation does not establish influence, motive or
  wrongdoing.

Political Finance Online provides CSV/PDF downloads and public routes used by its
web interface, but I could not find terms that expressly license reuse of the PFO
database. Please could you confirm:

1. whether the PFO data and database may be copied, normalized and republished in
   this way, including in an open-source and potentially commercial service;
2. the licence or database-right terms that apply;
3. the exact attribution wording and link you require;
4. whether the CSV download route may be used automatically, and any rate or cache
   limits you require;
5. whether you prefer a different supported download or API route.

We will keep the normalized feed disabled until these terms are clear.

Thank you.
