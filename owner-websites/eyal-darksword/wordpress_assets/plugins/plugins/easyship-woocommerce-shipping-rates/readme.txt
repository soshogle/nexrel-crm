=== Easyship WooCommerce Shipping Rates ===
Contributors: goeasyship, sunnycyk, alohachen, paulld, berniechiu, CarlosLongarela, joaosaraiva
Additional contributors: Anna Holubiatnikova, Andy Le, Anne Ju, Oleksandr Avoiants, YenJung Chen, John Hsu
Tags: woocommerce, shipping, shipping-rates, shipping-labels, shipping-calculator
Requires at least: 4.7
Tested up to: 6.9
Requires PHP: 7.1
Stable tag: 0.9.12
License: GPL-3.0
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Easyship for WooCommerce saves you time and money with live courier rates, seamless checkout, automated taxes & duties, and shipping label creation.

== Description ==

Easyship is a shipping platform that lets all merchants reach customers around the world with low shipping costs and increased conversion rates. So whether you’re sending out 100 shipments a month or 50,000, we have a solution that will fit your needs.
Over 100,000 online retailers trust us to save them time and money with smart shipping solutions. Integrate Easyship with your WooCommerce store now to see how you could streamline your delivery services.

= Ship Better with Easyship for WooCommerce =

* Access pre-negotiated shipping solutions from couriers around the world with just one account, or link your own courier accounts (including Fedex, UPS, DHL and more) and use your own rates
* Offer full transparency with dynamic rates at checkout to improve conversion - customers can choose their preferred shipping option knowing all costs, delivery time, and taxes
* Access 24/7 support so you can give your customers the service they expect
* Compare domestic and international shipping solutions

= Manage your shipments in one place =

* Sync orders and print labels with one click
* Store your product dimensions, category, and weight for faster processing and shipping costs, even with volumetric weights
* Automatically update “fulfilled” orders with tracking numbers and courier names
* Choose preferred solutions based on destinations, product type, or weight and expedite shipping with preset rules
* Maintain control of your finances by downloading past invoices, receipts, and transactions statements
* Monitor your shipments with notifications from your chosen couriers
* Automatically generate domestic return labels

= Ship internationally with confidence =
No other WooCommerce shipping app makes it this easy to reach customers around the world.

* Automatically generate and download ready-to-go shipping documents
* See exact import tax, VAT, GST and other fees upfront so there are no surprises
* Get accurate, complete Customs documentation and avoid issues and delays with your shipments

= Offer your customers total flexibility =

* Flexible shipping options increases conversion, so let your customers choose between the cheapest, fastest or best-value delivery solutions
* Reduce customer complaints and emails by showing clear delivery times
* In-cart settings give you the flexibility to choose prepaid (DDP) or postpaid (DDU) tax and duty - you can even include this as a checkout option

= Give customers a holistic post-purchase brand experience =

* Use branded packing slips to elevate the customer experience when they receive their parcel
* Send emails with your branding to give customers a fully branded journey from purchase to delivery
* Brand your tracking pages so your customers always know exactly what packages they’re tracking, no matter where in the world they are
* Send customers a link and let them track orders in real-time

= Monthly subscriptions that fit your business =

The Easyship app will always be free for new and small businesses, for companies shipping under 100 orders per month - you only pay your shipping costs.

Our subscription plans are based on the volume of shipments processed each month. Get the flexibility needed to scale your logistics and reach customers wherever they are based.

== Installation ==

= Minimum Requirements =

* PHP version 7.1 or greater
* WordPress 4.7 or greater
* WooCommerce 3.6 or greater
* PHP OpenSSL extension (openssl)

= Countries supported =

Easyship, the global shipping software, is currently available for stores located in the United States, Hong Kong, Canada, the United Kingdom, Singapore, and Australia. Shipping rates and tax calculations are available worldwide from these origin countries.

= Automatic installation =

Automatic installation is the easiest option as WordPress handles the file transfers itself and you don't need to leave your browser. To do an automatic install of Easyship-WooCommerce-Plugin, log in to your WordPress dashboard, navigate to the Plugins menu and click Add New.

In the search field type **Easyship WooCommerce Shipping Rates** and click Search Plugins. Once you’ve found our plugin you can view details about it such as the point release, rating and description. Most importantly of course, you can install it by simply clicking “Install Now”.

= Manual installation =

1. Unzip the files and upload the folder into your plugins folder (/wp-content/plugins/) overwriting older versions if they exist

2. Activate the plugin in your WordPress admin area.

= Set up =

There are 2 ways to integrate with Easyship.

Method 1:

1. After you activate the plugin, in the WooCommerce Setting page, go to the Shipping Tab and choose “Easyship Shipping”.

2. Click "Enable". After few steps, your rates are now available for all your customers!

Method 2:

1. Sign up for free at [www.easyship.com](https://app.easyship.com/signup) and go to [Connect > Add New](https://app.easyship.com/connect) to connect your WooCommerce store. You can then retrieve your Access Token from your store’s page by clicking on “Activate Rates”. This is also the place where you will be able to set all your shipping options and rules.

2. After you activate the plugin, in the WooCommerce Setting page, go to the Shipping Tab and choose “Easyship Shipping”.

3. The plugin is enabled by default after activation. Enter your API Token and save. Your rates are now available for all your customers!

== Frequently Asked Questions ==

= What WordPress version does the plugin support? =

The plugin is tested on WordPress version 4.7 to 6.8.3.

= What WooCommerce version does the plugin support? =

The plugin is tested on WooCommerce version 3.6 to 10.2.2.

For all other questions, please visit [www.easyship.com](https://www.easyship.com)

= The plugin is installed successfully, but the request timed out, what do I do? =

Your `wp-config.php` may have `WP_HTTP_BLOCK_EXTERNAL` set as true. You will need to add `https://*.easyship.com` url to your `WP_ACCESSIBLE_HOSTS` settings in order to allow requests going to the Easyship API server.

== Screenshots ==

1. Share your Easyship access token to activate
2. Install the Easyship plugin
3. Connect your WooCommerce store
4. Integrated rates in your store's checkout
5. Track all your shipments in one place
6. Compare and choose from 250+ shipping solutions
7. Manage your shipping settings, store your product catalog & create shipping rules

== Changelog ==

For the complete changelog, see [changelog.txt](changelog.txt).

= 0.9.12 - 2025-11-29 =
* Added - Tested with WordPress 6.9.
* Added - Tested with WooCommerce 10.3.5.

= 0.9.11 - 2025-10-10 =
* Fixed - Corrected PHP 7.1 compatibility.
* Fixed - Corrected a bug that prevented OAuth2 connections from being established.
* Fixed - Corrected a bug that prevented uninstall from working properly.

= 0.9.10 - 2025-10-02 =
* Fixed - Conforms to all WordPress Coding Standards
* Changed - A lot of code improvements and refactors, to facilitate future maintenance and improvements
* Changed - Minimum WordPress version is 4.7.
* Changed - Minimum WooCommerce version is 3.6.
* Changed - Minimum PHP version is 7.1.
* Added - New logging framework, to more effectively use WooCommerce's logging features.
* Added - New upgrading framework, to facilitate future upgrades.
* Added - Tested with WordPress 6.8.3.
* Added - Tested with WooCommerce 10.2.2.

== Upgrade Notice ==

--

== License ==

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
