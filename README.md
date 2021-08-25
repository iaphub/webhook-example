<a href="https://www.iaphub.com" title="IAPHUB">
  <img width=882px src="https://www.iaphub.com/img/github/github-rn-ad.png" alt="IAPHUB">
</a>
<br/>
<br/>

This is an example of a Node.JS server in sync with IAPHUB thanks to our webhooks.

Using webhooks to synchronize your server with IAPHUB offers many advantages, validating an in-app purchase from your server is always the safest implementation.

If you're looking to sync the state of your subscriptions and process consumables, which is what 99% of our users need, this is the perfect example.<br/>

The example is in Node.JS but it shouldn't be an issue if you're using a different language, the purpose of this example is for you to understand the logic behind it.<br/>

By implementing webhooks just like the example below, you'll be able to:
- Detect when a user buys a consumable
- Detect when a user refund a consumable
- Detect when a user buys a subscription and always be up to date with the latest state of the subscription (in order to restrict the access to certain features depending on the subscription state).

No need to say you also won't need to rely on IAPHUB using the `getActiveProducs()` method on the client side to check if the user has an active subscription, you'll be able to use your API 🙂

You can also find the webhooks documentation [here](https://www.iaphub.com/docs/webhooks/introduction).<br/>
When you're ready to test your webhooks, you can enable them in the settings of your app, [more infos here](https://www.iaphub.com/docs/getting-started/set-up-app#webhooks).