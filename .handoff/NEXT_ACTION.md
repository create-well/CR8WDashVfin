# Next Action

Run the protected Notion operator in dry-run mode and verify that Money returns 2 records with Amount values 123.45 and -67.89. If the dry-run payload is correct, run the deliberate mirror refresh so the dashboard can display the samples.

Then deploy the registry change and verify production reads Money records plus existing Checkbox and Number values.

Delete the two `[DEV SAMPLE]` Notion pages after testing if they are no longer needed. Do not delete any non-sample Money records.
