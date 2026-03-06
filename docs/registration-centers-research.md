# Registration Center Research

Last updated: 2026-03-06

## Scope

This file documents the initial address research for military registration / conscription offices that the assistant can later use for branch lookup and nearest-center flows.

## What Was Confirmed

- The Ministry of Defense public site confirms the main ministry address and general hotline.
- The current repo knowledge base only lists cities with military registration centers, not branch-by-branch street addresses.
- A large number of branch-level addresses were available on 08.ge military-office directory pages.
- Batumi and Kobuleti addresses were also visible on 2GIS, which provided a second third-party check.

## Source Hierarchy

1. Official MOD public contact pages
2. National conscription agency website links shown on branch pages
3. 08.ge military office directory pages
4. 2GIS cross-checks where available

## Verification Rules Used

- `official_mod`: directly confirmed by the Ministry of Defense public site
- `third_party_directory`: exact branch page found on 08.ge
- `cross_checked_third_party`: address matched on 08.ge and 2GIS
- `directory_cross_reference`: address appeared as a subsidiary listing on a regional-center page, but the direct branch page was not separately opened during this pass

## Current Limitations

- I did not find a clean official MOD directory for every regional or municipal branch.
- Some offices still need official confirmation by calling the shared hotline or locating a government-published directory.
- The current dataset focuses on Tbilisi, Ajara, Kakheti, Kvemo Kartli, Shida Kartli, and the Imereti cluster, plus a small Samtskhe-Javakheti sample.

## Recommended Next Steps

1. Call or email the shared hotline / agency contact to verify branch-by-branch addresses.
2. Add latitude/longitude once the address list is stable.
3. Use the JSON dataset in a nearest-center lookup flow.
4. Ask browser geolocation permission only after the center dataset is verified.
