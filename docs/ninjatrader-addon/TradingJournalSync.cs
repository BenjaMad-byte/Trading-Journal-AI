#region Using declarations
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using NinjaTrader.Cbi;
#endregion

// Trading Journal AI — NinjaTrader live sync AddOn.
//
// Sends every execution fill to the journal's /api/live/execution endpoint as
// soon as it happens, so a round trip is recorded the moment it closes — no
// CSV export/import needed.
//
// Setup:
//   1. Edit JournalAccountId and ApiKey below.
//      - JournalAccountId: open the journal, Settings > Accounts, use that account's id
//        (or GET http://localhost:8010/api/accounts).
//      - ApiKey: copy NINJATRADER_API_KEY from backend/.env.
//   2. NinjaTrader 8 > Tools > Edit NinjaScript > New AddOn... name it
//      TradingJournalSync, paste this file's contents, compile (F5).
//   3. Restart NinjaTrader. The AddOn activates automatically and starts
//      posting fills for every account NinjaTrader has open.
//
// Futures tickers: the journal expects the root prefixed with "/" (e.g.
// "/MES") to apply the right $-per-point multiplier — this AddOn adds that
// prefix automatically for futures instruments.
//
// No JSON library is referenced by NinjaScript's compiler, so the request
// body is built by hand below — fine for this fixed, small set of fields.

namespace NinjaTrader.NinjaScript.AddOns
{
    public class TradingJournalSync : NinjaTrader.NinjaScript.AddOnBase
    {
        private static readonly HttpClient httpClient = new HttpClient();

        private const string ApiUrl = "http://localhost:8010/api/live/execution";
        private const string ApiKey = "6156d19d6ab1be873691bf7329243a3bb23e0de3928b0251";
        private const int JournalAccountId = 2;

        // Running net position per account+instrument, used to work out which
        // side (LONG/SHORT) a fill belongs to. NinjaTrader's OrderAction alone
        // is not reliable for this: a Netting-mode account (the default for
        // most futures accounts, including sim) reports plain Buy/Sell even when
        // the fill opens a short — SellShort/BuyToCover only show up in
        // Hedging-mode accounts. Tracking the position ourselves works either way.
        // Reset to 0 on every NinjaTrader restart — a position already open
        // from a previous session is treated as opening fresh on its next fill.
        private static readonly Dictionary<string, int> positionByKey = new Dictionary<string, int>();

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "Trading Journal Sync";
            }
            else if (State == State.Active)
            {
                foreach (Account account in Account.All)
                    account.ExecutionUpdate += OnExecutionUpdate;
            }
            else if (State == State.Terminated)
            {
                foreach (Account account in Account.All)
                    account.ExecutionUpdate -= OnExecutionUpdate;
            }
        }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            Execution execution = e.Execution;
            if (execution == null || execution.Order == null)
                return;

            string action = MapAction(execution.Order.OrderAction);
            bool isBuyFill = action == "BOT";
            int signedQty = isBuyFill ? execution.Quantity : -execution.Quantity;

            string key = execution.Account.Name + "|" + execution.Instrument.FullName;
            int priorQty;
            positionByKey.TryGetValue(key, out priorQty);

            // Flat going into this fill: it opens a new position in its own
            // direction. Otherwise it follows whichever direction the account
            // already held (adding to it or partially/fully closing it).
            string side = priorQty != 0 ? (priorQty > 0 ? "LONG" : "SHORT") : (isBuyFill ? "LONG" : "SHORT");
            positionByKey[key] = priorQty + signedQty;

            string instrumentType = MapInstrumentType(execution.Instrument.MasterInstrument.InstrumentType);
            string ticker = execution.Instrument.MasterInstrument.InstrumentType == InstrumentType.Future
                ? "/" + execution.Instrument.MasterInstrument.Name
                : execution.Instrument.MasterInstrument.Name;

            string json = BuildJson(
                ticker, instrumentType, side,
                execution.Time.ToString("yyyy-MM-dd"),
                execution.Time.ToString("HH:mm:ss"),
                action, execution.Quantity,
                (double)execution.Price, (double)execution.Commission);

            SendAsync(json);
        }

        private static string MapAction(OrderAction orderAction)
        {
            switch (orderAction)
            {
                case OrderAction.Buy:        return "BOT";
                case OrderAction.Sell:        return "SOLD";
                case OrderAction.SellShort:   return "SOLD";
                case OrderAction.BuyToCover:  return "BOT";
                default:                      return "BOT";
            }
        }

        private static string MapInstrumentType(InstrumentType t)
        {
            switch (t)
            {
                case InstrumentType.Future: return "FUTURE";
                case InstrumentType.Option: return "OPTION";
                default: return "STOCK";
            }
        }

        // CultureInfo.InvariantCulture matters here: on a machine whose Windows
        // locale uses a comma decimal separator, default ToString() would emit
        // "5000,25" and break the JSON number.
        private static string BuildJson(
            string ticker, string instrumentType, string side,
            string date, string time, string action, int qty,
            double price, double commission)
        {
            var sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"account_id\":").Append(JournalAccountId).Append(",");
            sb.Append("\"ticker\":\"").Append(JsonEscape(ticker)).Append("\",");
            sb.Append("\"instrument_type\":\"").Append(instrumentType).Append("\",");
            sb.Append("\"side\":\"").Append(side).Append("\",");
            sb.Append("\"date\":\"").Append(date).Append("\",");
            sb.Append("\"time\":\"").Append(time).Append("\",");
            sb.Append("\"action\":\"").Append(action).Append("\",");
            sb.Append("\"qty\":").Append(qty.ToString(CultureInfo.InvariantCulture)).Append(",");
            sb.Append("\"price\":").Append(price.ToString(CultureInfo.InvariantCulture)).Append(",");
            sb.Append("\"commission\":").Append(commission.ToString(CultureInfo.InvariantCulture));
            sb.Append("}");
            return sb.ToString();
        }

        private static string JsonEscape(string s)
        {
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        private async Task SendAsync(string json)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json"),
                };
                request.Headers.Add("X-API-Key", ApiKey);
                HttpResponseMessage response = await httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                    NinjaTrader.Code.Output.Process(
                        "Trading Journal Sync: HTTP " + response.StatusCode + " sending execution",
                        PrintTo.OutputTab1);
            }
            catch (Exception ex)
            {
                NinjaTrader.Code.Output.Process(
                    "Trading Journal Sync error: " + ex.Message, PrintTo.OutputTab1);
            }
        }
    }
}
