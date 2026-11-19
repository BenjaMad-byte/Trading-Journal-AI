# Sync NinjaTrader trades live

Each execution fill from NinjaTrader is sent to the journal as it happens, so a
trade is recorded the moment the position closes — no CSV export/import step.

## 1. Create an account in the journal

Open the journal (http://localhost:3010), add an account under Settings if
you haven't already, and note its id (Settings > Accounts, or
`GET http://localhost:8010/api/accounts`).

## 2. Set the shared API key

`backend/.env` already has a `NINJATRADER_API_KEY` generated for you during
setup. Keep it — you'll paste it into the AddOn in step 4. Restart the backend
after any change to `.env`.

## 3. Install the AddOn in NinjaTrader 8

1. Open NinjaTrader 8 > **Tools > Edit NinjaScript > New AddOn...**
2. Name it `TradingJournalSync`.
3. Replace the generated file's contents with
   [`docs/ninjatrader-addon/TradingJournalSync.cs`](ninjatrader-addon/TradingJournalSync.cs).
4. Edit the two constants near the top:
   - `JournalAccountId` — the account id from step 1.
   - `ApiKey` — the `NINJATRADER_API_KEY` value from step 2.
5. Compile (F5 in the NinjaScript Editor).
6. Restart NinjaTrader. The AddOn activates automatically and starts posting
   fills for every account NinjaTrader has open — no further activation step.

## 4. Test it

Take one small, real (or sim) round-trip trade in NinjaTrader. It should
appear in the journal's Trades view right after the position closes, tagged
`source: ninjatrader`.

If it doesn't show up, open NinjaTrader's **Log** (Control Center > Log tab) —
the AddOn prints `Trading Journal Sync error: ...` there if the backend is
unreachable or the API key doesn't match.

## Notes

- The backend must be running (`launch.bat`) for fills to be recorded; a fill
  sent while it's down is simply lost — NinjaTrader doesn't retry.
- Multiple accounts: run several copies of the AddOn logic (or extend it) with
  one `JournalAccountId` mapped per NinjaTrader account if you trade more than
  one account.
- One account only, by design: a single `JournalAccountId` constant means
  every NinjaTrader account you have open feeds that one journal account. If
  you trade several accounts and want them kept separate in the journal,
  you'll need to adapt the AddOn to map NinjaTrader's `account.Name` to the
  right journal account id.
