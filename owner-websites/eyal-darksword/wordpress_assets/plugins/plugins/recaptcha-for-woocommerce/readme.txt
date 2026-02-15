=== reCaptcha for WooCommerce===
Contributors:nik00726
Tags:Recaptcha
Requires at least:3.0
Tested up to:6.9
Version:2.71
Stable tag:2.71
License: GPLv3
License URI: http://www.gnu.org/licenses/gpl-3.0.html

Protect your eCommerce site with google reCaptcha. 

== Description ==


Protect your eCommerce site with google recptcha. 


**=Features=**

1. Support both reRecapcha V2 and V3.

2. Support both Classic Checkout and Checkout Block(Beta).

3. Login reCaptcha

4. Registration reCaptcha

4. Lost password reCaptcha

6. Guest checkout reCaptcha

7. Login user checkout reCaptcha

8. Add payment method reCaptcha

9. WooCommerce pay for order captcha

10. WP-Login reCaptcha

11. WP-Register reCaptcha

12.WP-Lost password reCaptcha

13.Custom label for reCaptcha

14.Custom error messages

15.Recaptcha dark/light theme

16.Captcha full/compact mode

17.Auto-detect user language

18.Disable submit button until captcha checked

19.Reset captcha on order postback error

20.Bypass reCAPTCHA (do not show captcha) using IP or IP-Range for specific clients/users

21.Captcha For Jetpack Forms






[Get Support](http://www.i13websolution.com/contacts)


== Installation ==

This plugin is easy to install like other plug-ins of Wordpress as you need to just follow the below mentioned steps:

1. upload woo-recaptcha folder to wp-Content/plugins folder.

2. Activate the plugin from Dashboard / Plugins window.

4. Now Plugin is Activated, You can see reCaptcha tab in woocommerce settings screen.


### Usage ###

1.Use of plugin “reCaptcha for WooCommerce” is easy.

2.You can goto settings screen of WooCommerce where you can see reCaptcha tab

3.Now set reCaptcha keys and enabled reCaptcha on required places.




== Changelog ==


= 2.71 =

* Fixed - Some old users complain that after updates to plugin, captcha disappears and only reappears after saving settings.


= 2.70 =

* Added - Supports  Google reCAPTCHA + Cloudflare Turnstile  — Choose the CAPTCHA that best fits your store’s needs.


= 2.69 =

* Fixed - PayPal trigger reCaptcha validation when captcha is turned OFF
* Added - Added Moneris reCaptcha support on Pay Order Page


= 2.68 =

* Added - Now PayPal express checkout buttons also protected with reCaptcha


= 2.67 =

* Fix - Fixed bypass sequirity validation(Proof of concept)


= 2.66 =

* Fix - Sometimes it log Warning for Undefined constant


= 2.65 =

* Fix - Restricted API Key not working for enterprise reCaptcha


= 2.64 =

* Add - Improvements in reCaptcha V3 token generate


= 2.63 =

* Add - Added support for Express Checkout Buttons


= 2.62 =

* Fix - Fixed Potential vulnerability


= 2.61 =

* Add - Now supports reCaptcha Enterprise
* Fix - Fixed registration reCaptcha required error when registration enabled at checkout page



= 2.60 =

* Fix - Fixed vulnerability - Bypass API blocking


= 2.59 =

* Add - Now support hybrid reCaptcha (V3 as main reCaptcha and use V2 when V3 get fail so that user not blocked)
* Update - Removed option - Disable on the fly reCAPTCHA v3 token generation, It is default now
* Update - Improved reCaptcha code





= 2.58 =

* Add - Added feature - Block orders from “unknown” origin
* Add - Block registration REST endpoints
* Update - Enhanced block REST checkout endpoints



= 2.57 =

* Fix - Fixed issue of Store API bypass captcha

= 2.56 =

* Add - Added support to block Checkout REST API


= 2.55 =

* Add - Added support of reCaptcha into checkout block (new checkout page)


= 2.54 =

* Fix - Fixed latest version 2.53 cause issue with reCaptcha exception, So that is fixed


= 2.53 =

* Fix - Fixed issue of reCaptcha V2 token unset on ajax call


= 2.52 =

* Fix - Fixed issue of Apple Pay/Google Pay not working in Stripe Payment Gateway


= 2.51 =

* Fix - Fixed issue of broken json while user loged in and try payment using Intuit Payment processer


= 2.50 =

* Fix - Fixed compatibility issue with WooCommerce Square digital wallets (GPay/Apple Pay) on checkout


= 2.49 =

* Add - Added fallback token mechanism in checkout section for reCaptcha V3 in case of token failed to generate.
* Fix - Fixed request button (Gpay/Apple Pay) reCaptcha error on checkout form


= 2.48 =

* Fix - Fixed issue of sensei lms login/signup with reCaptcha



= 2.47 =

* Fix - Fixed issue of "nonce verification failed" error replying Comment/review in admin reply.

= 2.46 =

* Fix - Fixed issue of wpautop auto adding <p> tags to <scripts>



= 2.45 =

* Fix - Fixed recent version did not worked with Intuit Payments
* Fix - Fixed nonce vulnerabilities


= 2.44 =

* Fix - Fixed compatibility with WooCommerce phone order plugin
* Fix - Fixed nonce vulnerabilities
* Update - Tested with WordPress 6.2


= 2.43 =

* Fix - Fixed JetPack reCaptcha throw error after successfully sent email. Attempt to read property nodeValue on null


= 2.42 =

* Fix - Fixed PayPal standard got stuck in a loop if reCaptcha expired in between


= 2.41 =


* Update - Improvements on Jetpack Forms Captcha

= 2.40 =

* Add - New feature jetpack forms captcha
* Fix - Fixed order track captcha not working with new WooCommerce
* Update - Improvements on jquery functions


= 2.39 =

* Update - Plugin is compitible with WooCommerce new feature HPOS(High-Performance Order Storage)


= 2.38 =

* Fix - Fixed add payment method captcha not working for some themes


= 2.37 =

* Update - Improvements on security for nonce checking


= 2.36 =

* Fix - Fixed review captcha not working on some clients


= 2.35 =

* Fix - Fixed critical error occured for some of clients


= 2.34 =

* Update - Tested with WordPress 6.0
* Update - Tested with WooCommerce 6.5


= 2.33 =


* Add - Added action for checkout registration form - i13_woo_checkout_regform_action to render captcha on checkout registration form. For example
  for example you can do something like below in your functions.php
  
    add_action('woocommerce_after_checkout_registration_form', 'i13woo_extra_checkout_register_fields', 9999);
    function i13woo_extra_checkout_register_fields(){

        do_action( 'i13_woo_checkout_regform_action');
    }
    
= 2.32 =

* Fix - Fixes for reCaptcha not working with Wordfence Security 2FA - wp login


= 2.31 =

* Fix - Fixes for reCaptcha v3 multiple instance not working on checkout in some themes


= 2.30 =

* Fix - Fixes Google Pay issue in some themes


= 2.29 =

* Fix - Fixes for order tracking causing problem for contact form 7 reCaptcha.
* Fix - Fixes for order tracking captcha turn off ignored.


= 2.28 =

* Fix - Fixes for WooCommerce signup/login captcha did not work for some themes to due to custom forms.


= 2.27 =

* Add - Added support for buddy press signup. See reCaptcha for WooCommerce Signup Settings.
* Fix - Fixes settings mismatch for Signup with WP signup method
* Update - Tested with WordPress 5.9


= 2.26 =

* Update - WooCommerce 6.0 compatibility fixes.
* Fix - Tested with WooCommerce 6.0


= 2.25 =

* Fix - reCaptcha V3 fixes:- Add payment method asking for captcha even it is disabled to use captcha.



= 2.24 =

* Fix - Fixed pay for an order captcha not showing when not enabled for login/guest captcha.
* Update - Separated captcha option for cart request button captcha and product page request button captcha


= 2.23 =

* Update - Move reCaptcha to last field in review form of WooCommerce as it looks better.


= 2.22 =

* Fix - Fixed PHP Warning:  Undefined variable $i13_recapcha_v2_lang


= 2.21 =

* Add - Added new option to enable reCaptcha for WooCommerce order tracking.
* Fix - Fixed conflict with plugin Memberium Plugin.
* Update - Delay execution action so that captcha will be last field in WooCommerce registration/login forms.



= 2.20 =

* Fix - Fixed for - When there is multiple forms of registration and login on same page it create problems.
* Fix - Fixed for - When the registration/login forms are in ajax modal popup it wont work. - Added option in signup/login settings for enable ajax signup/login modal box
* Update - Tested with WordPress 5.8


= 2.18 =

* Update - As Google is blocked in someone countries like china, We need global recaptcha domain use(https://recaptcha.net/) so added settings option use recaptcha.net instead of google.com


= 2.17 =

* Add - Added filter for reCaptcha v2 to change language if needed programmatically. To change hl paramter of recaptcha anyone can use this filter - i13_recapchav2_set_lang


= 2.16 =

* Add - Added functionality to Bypass reCAPTCHA (do not show captcha) using IP or IP-Range for your clients/users

= 2.15 =

* Fix - Fixed registration captcha not work for some theme as it is using _nonce.

= 2.14 =

* Add - Added captcha for Post Comment forms.


= 2.13 =

* Fix - Fixed complain that plugin automatically deactivated.


= 2.12 =

* Fix - Fixed Elavon payment processor shown catcha twice on add payment method page


= 2.11 =

* Add - Added option to enable/disable recaptcha for stripe payment request buttons (Google Pay and Apple Pay)


= 2.10 =

* Add - Added option to disable on the fly reRecapcha v3 generation for checkout
* Add - Disable recaptcha plugin when while using REST end point

= 2.9 =

* Add - Added reCAPTCHA for product review form.
* Add - Added recaptcha v2 language selection
* Fix - Fixed recaptcha duplication on Elavon credit card pay for order


= 2.8 =

* Fix - Fixed problem with Elavon payment processor legacy mode.


= 2.7 =


* Add - Added support for Elavon payment processor

* Add - Added new option “Disable on the fly reCAPTCHA v3 token generation” that will allow you to use this option if two submit button fighting for taking control. So use only if you have problem
  with submit button.
  
* Fix - Fixed problem with javascript errors, When the html of page is minified.


= 2.6 =

* Fix - Google reCAPTCHA token is missing Fixed


= 2.5 =

* Add - Added support for custom login form that built using “wp_login_form” function

= 2.4 =

* Fix - Fixed reCAPTCHA v3 not working with 2FA.


= 2.3 =

* Fix - Fixed reCaptcha not working for IE 11.


= 2.2 =

* Fix - Fixed reCaptcha v2 disable submit button on reCaptcha reset problem


= 2.1 =

* Fix - Fixed Uncaught SyntaxError: Unexpected string error after updates 2.0

= 2.0 =

* Add -  Now “recaptcha for woocommerce” support google latest version of greCAPTCHA V3
* Add -  This version never disturb user, ReCaptcha V3 Uses a behind-the-scenes scoring system to detect abusive traffic, and lets you decide the minimum passing score. Please note that there is no user interaction shown in reRecapcha V3 meaning that no recaptcha challenge is shown to solve.

= 1.0.17 =

* Add -  Added captcha protection for WooCommerce Pay For Order (This is only used when your order is failed. WooCommerce allow failed order to repay using this page.



= 1.0.16 =

* Add -  Added option for checkout captcha to refresh when there are checkout errors.
* Fix - Fixed issue of refresh captcha sometimes not working


= 1.0.15 =

* Update - Tested With WooCommerce 4.4.0

= 1.0.14 =

* Add -  Added javascript callbacks after reCaptcha varified
* Update - Tested With WordPress 5.5


= 1.0.13 =

* Fix - Fixed issue of Add payment method captcha not shwoing up.

= 1.0.12 =

* Fix - Removed jQuery.noConflict() as this cause problem for some of users.


= 1.0.11 =

* Add - Added facility to show/hide reCaptcha label
* Update - Tested with WooCommerce 4.2


= 1.0.10 =

* Fix - Fixed small problem reported by user when nonce is diffrent
* Update - Tested with WooCommerce 4.1


= 1.0.9 =

* Fix - Fixed broken link in admin WooCommerce reCaptcha settings tab

* Add - Added new protection for Add payment method

* Add - Added new feature - disable submit button until captcha checked

* Add - Added translation so that if messages labels etc left blank then you can translate it


= 1.0.8 =

* Fix - As per some of the clients complain that Recaptcha not working when the payment processer takes more time. So added ReCaptcha validity settings for checkout. So once Recaptcha verified it will valid for a given number of minutes

* Add - Added option to enable reCpacha on login checkout

* Fix - Fixed for multisite have problem when not activated for networks


= 1.0.6 =

* Fix - Important fix found by Macneil. His hosting is strict and there is problem while loading recaptcha settings tab


= 1.0.5 =

* Add - Make plugin compatible with WordPress multisite

= 1.0.4 =

* Add - Added new option “No-conflict” mode. This will helpful when there is conflict is Recaptcha js


= 1.0.3 =

* Fix - Fixed error reported by Thomas Wurwal that some of theme not rendere captcha on checkout page, due to in wp_enqueue_scripts action is_woocommerce() return false.


= 1.0.2 =

* Fix - Fixed error shown in console “reCaptcha already rendered”
* Add - Added option to refresh reCaptcha on checkout page

= 1.0.1 =

* Update - Tested with WooCommerce 4.0

= 1.0 =

* Update - Stable 1.0 first release

