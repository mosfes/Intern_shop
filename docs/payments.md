# Omise payment notifications

Run `npm run db:setup-payments` and `npm run db:generate` before starting the updated app.
The additive setup creates `CheckoutPayment` alongside the existing payment ledger.

In Omise Dashboard → Webhooks, register:

```text
https://YOUR-SHOP-DOMAIN/api/payments/webhook
```

Configure Test and Live modes separately. Omise requires a publicly accessible HTTPS
endpoint; it cannot deliver notifications to localhost. When a webhook signing secret
is enabled in the dashboard, copy its Base64 value to server-only
`OMISE_WEBHOOK_SECRET` and restart/redeploy the app. Never put it in a `NEXT_PUBLIC_` variable.
Without that variable, independent authenticated charge verification is still used.

Checkout saves the user, server-priced products, total and delivery details before
creating the charge. Webhooks fetch the charge from Omise and check the saved owner,
currency, amount and charge ID before changing the payment. Successful settlement,
the payment ledger, coupon usage and removal of ordered cart lines happen in one
database transaction. Duplicate notifications and browser polling cannot count an
order twice. A delayed event cannot downgrade a paid order.

Immediate card successes settle in the charge API as well: non-3DS charges do not
emit `charge.complete`. The orders API also checks up to five recent pending charges
when a customer returns, as a fallback for missed webhook deliveries.

Orders are fetched for the signed-in customer on session restore, tab focus and
while the orders page is open. New orders survive closing the browser and signing
in on another device. Payments started before this update lack a server snapshot
and still require their original browser's pending-checkout data.

## Test

1. Start a new PromptPay or Mobile Banking test checkout.
2. Close the shop tab before completing payment.
3. Mark the charge successful in Omise Test Dashboard and confirm webhook delivery.
4. Reopen the shop and sign in; the order must appear in My Orders.
5. Redeliver the event: there must still be one order and one coupon use.
6. Repeat with failure: no paid order may be created.

Automated checks: `node --import tsx --test tests/payments.test.ts tests/payment-webhook.test.ts`.

Reference: https://docs.omise.co/api-webhooks
