<?php
/*
 * Plugin Name: Nuvei Gateway for WooCommerce
 * Description: Take credit card payments on your store using Nuvei.
 * Author: Nuvei
 * Author URI: https://www.nuvei.com/
 * Version: 2.7.2
 * Text Domain: nuvei-gateway-for-woocommerce
 *
 * Tested up to: 5.9.1
 * WC tested up to: 6.2.1
 *
 * Copyright (c) 2020 Nuvei
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Required minimums and constants
 */
define( 'Nuvei_Gateway_for_WC_VERSION', '2.7.2' );
define( 'Nuvei_Gateway_for_WC_MIN_PHP_VER', '7.0.0' );
define( 'Nuvei_Gateway_for_WC_MIN_WC_VER', '2.5.0' );
define( 'Nuvei_Gateway_for_WC_MAIN_FILE', __FILE__ );
define( 'WC_Nuvei_PLUGIN_URL', untrailingslashit( plugins_url( basename( plugin_dir_path( __FILE__ ) ), basename( __FILE__ ) ) ) );

class Nuvei_Gateway_for_WC {

    /**
     * @var Singleton The reference the *Singleton* instance of this class
     */
    private static $instance;

    /**
     * @var Reference to logging class.
     */
    private static $log;

    /**
     * Returns the *Singleton* instance of this class.
     *
     * @return Singleton The *Singleton* instance.
     */
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Private clone method to prevent cloning of the instance of the
     * *Singleton* instance.
     *
     * @return void
     */
    public function __clone() {}

    /**
     * Private unserialize method to prevent unserializing of the *Singleton*
     * instance.
     *
     * @return void
     */
    public function __wakeup() {}

    /**
     * Flag to indicate whether or not we need to load code for / support subscriptions.
     *
     * @var bool
     */
    private $subscription_support_enabled = false;

    /**
     * Flag to indicate whether or not we need to load support for pre-orders.
     *
     * @since 3.0.3
     *
     * @var bool
     */
    private $pre_order_enabled = false;

    /**
     * Notices (array)
     * @var array
     */
    public $notices = array();

    /**
     * Protected constructor to prevent creating a new instance of the
     * *Singleton* via the `new` operator from outside of this class.
     */
    protected function __construct() {
        $this->terminal_settings = [];

        add_action( 'admin_init', array( $this, 'check_environment' ) );
        add_action( 'admin_notices', array( $this, 'admin_notices' ), 15 );
        add_action( 'plugins_loaded', array( $this, 'init' ) );
    }

    /**
     * Init the plugin after plugins_loaded so environment variables are set.
     */
    public function init() {
        // Don't hook anything else in the plugin if we're in an incompatible environment
        if ( self::get_environment_warning() ) {
            return;
        }

        // Init the gateway itself
        $this->init_gateways();

        // Background Validation
        $options = get_option("woocommerce_nuvei_settings");
        $background_validation = isset($options['background_validation'])?$options['background_validation']:false;

        function runNuveiOnInit() {
            $uniqueref = wc_clean(wp_unslash($_POST['UNIQUEREF']));
            $order_id = wc_clean(wp_unslash($_POST['ORDERID']));
            $responseCode = wc_clean(wp_unslash($_POST['RESPONSECODE']));

            $order = wc_get_order($order_id);
            $orderStatus = $order->get_status();
            $orderStatus = 'wc-' === substr( $orderStatus, 0, 3 ) ? substr( $orderStatus, 3 ) : $orderStatus;

            if($responseCode == 'A') {
                if($orderStatus == 'pending' || $orderStatus == 'failed') {
                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Payment processed correctly and Background Validation completed #'. $uniqueref, 'woocommerce' ) );

                    $order->set_transaction_id( $uniqueref );

                    $order->save();
                } else {
                    $order->add_order_note( __( 'Background Validation completed #'. $uniqueref, 'woocommerce' ) );
                }
            } else {
                if($orderStatus == 'pending') {
                    $order->update_status(apply_filters('woocommerce_gateway_nuvei_process_payment_order_status', 'failed', $order), __('Payment failed #' . $uniqueref, 'woocommerce'));
                } else {
                    $order->add_order_note( __( 'Background Validation completed #'. $uniqueref, 'woocommerce' ) );
                }
            }

            echo 'OK';
            exit;
        }
        if(isset($_POST['UNIQUEREF'])) {
            if ( $background_validation == "yes" ) {
                $terminalId = wc_clean(wp_unslash($_POST['TERMINALID']));
                $order_id = wc_clean(wp_unslash($_POST['ORDERID']));
                $amount = wc_clean(wp_unslash($_POST['AMOUNT']));
                $dateTime = wc_clean(wp_unslash($_POST['DATETIME']));
                $responseCode = wc_clean(wp_unslash($_POST['RESPONSECODE']));
                $responseText = wc_clean(wp_unslash($_POST['RESPONSETEXT']));
                $hash = wc_clean(wp_unslash($_POST['HASH']));

                $env = "live_";
                if($options['testmode'] == "yes")
                    $env = "test_";

                if($terminalId == $options[$env.'publishable_key2']) {
                    $secret = $options[$env.'secret_key2'];
                    $currency = $options[$env.'currency2'];
                    $multicurrency = $options[$env.'multicurrency2'];
                } else if($terminalId == $options[$env.'publishable_key3']) {
                    $secret = $options[$env.'secret_key3'];
                    $currency = $options[$env.'currency3'];
                    $multicurrency = $options[$env.'multicurrency3'];
                } else {
                    $secret = $options[$env.'secret_key'];
                    $currency = $options[$env.'currency'];
                    $multicurrency = $options[$env.'multicurrency'];
                }

                $expectedHash = md5($terminalId . $order_id . ($multicurrency=='yes' ? $currency : '') . $amount . $dateTime . $responseCode . $responseText . $secret);

                if($expectedHash == $hash)
                    add_action( 'init', 'runNuveiOnInit' );
                else {
                    echo 'Incorrect HASH';
                    exit;
                }
            } else {
                    echo 'Background Validation not enabled in Nuvei plugin';
                    exit;
            }
        }
        // ----------------- End of Background Validation

        add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( $this, 'plugin_action_links' ) );
        add_action( 'wp_ajax_nuvei_dismiss_request_api_notice', array( $this, 'dismiss_request_api_notice' ) );

        add_action( 'woocommerce_thankyou', array( $this, 'checkResponse'), 10, 1 );
        add_action( 'woocommerce_before_checkout_form', array( $this, 'check3DSResponse'), 1, 1 );
        add_action( 'woocommerce_before_checkout_form', array( $this, 'checkSecureCardRegisterResponse'), 2, 1 );

        add_action('woocommerce_update_product', array( $this, 'woocommerce_nuvei_stored_subscription_management'), 10, 2);



        add_filter( 'before_delete_post', array( $this, 'woocommerce_nuvei_stored_subscription_delete'), 10, 2 );
        if(isset($_GET['action']) && $_GET['action'] === "duplicate_product") {
            add_filter( 'added_post_meta', array( $this, 'woocommerce_nuvei_stored_subscription_duplicate'), 10, 4 );
        }
        if((isset($_GET['post_type']) && $_GET['post_type'] == "shop_subscription" && isset($_GET['action'])) ||
            (isset($_GET['change_subscription_to']) && $_GET['change_subscription_to'] == "cancelled"))
        {
            add_filter( 'save_post', array( $this, 'woocommerce_nuvei_subscription_update'), 10, 4 );
        }

        // Add subscription pricing fields on edit product page
        add_action( 'woocommerce_product_options_general_product_data', array( $this, 'woocommerce_nuvei_product_options_general_product_data' ), 9, 0 );


		add_action( 'save_post',  array( $this, 'woocommerce_nuvei_save_subscription_meta' ), 10 );

		add_action( 'rest_api_init', function () {
            register_rest_route( 'nuvei-gateway-for-woocommerce/v1', 'applepaysession', array(
                'methods' => 'GET',
                'callback' => array( $this, 'applepaysession_controller' ),
                'permission_callback' => '__return_true',
            ) );
        } );
    }

    public function get_terminal_settings() {
        $options = get_option("woocommerce_nuvei_settings");

        $this->testmode                = 'yes' === $options['testmode'];
        $this->secret_key              = $this->testmode ? $options['test_secret_key'] : $options['live_secret_key'];
        $this->publishable_key         = $this->testmode ? $options['test_publishable_key'] : $options['live_publishable_key'];
        $this->currency         = $this->testmode ? $options['test_currency'] : $options['live_currency'];
        $this->multicurrency         = $this->testmode ? $options['test_multicurrency'] : $options['live_multicurrency'];
        $this->secret_key2              = $this->testmode ? $options['test_secret_key2'] : $options['live_secret_key2'];
        $this->publishable_key2         = $this->testmode ? $options['test_publishable_key2'] : $options['live_publishable_key2'];
        $this->currency2         = $this->testmode ? $options['test_currency2'] : $options['live_currency2'];
        $this->multicurrency2         = $this->testmode ? $options['test_multicurrency2'] : $options['live_multicurrency2'];
        $this->secret_key3              = $this->testmode ? $options['test_secret_key3'] : $options['live_secret_key3'];
        $this->publishable_key3         = $this->testmode ? $options['test_publishable_key3'] : $options['live_publishable_key3'];
        $this->currency3         = $this->testmode ? $options['test_currency3'] : $options['live_currency3'];
        $this->multicurrency3         = $this->testmode ? $options['test_multicurrency3'] : $options['live_multicurrency3'];

        $currency = get_woocommerce_currency();

        if($this->currency == $currency && $this->publishable_key && $this->secret_key) {
            $terminalId = $this->publishable_key;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key;

            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);

            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();

            $this->terminal_settings = $terminalFeatures;
        } else if($this->currency2 == $currency && $this->publishable_key2 && $this->secret_key2) {
            $terminalId = $this->publishable_key2;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key2;

            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);

            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();

            $this->terminal_settings = $terminalFeatures;
        } else if($this->currency3 == $currency && $this->publishable_key3 && $this->secret_key3) {
            $terminalId = $this->publishable_key3;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key3;

            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);

            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();

            $this->terminal_settings = $terminalFeatures;
        } else if ($this->multicurrency == 'yes') {
            $terminalId = $this->publishable_key;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key;
            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);
            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();
            $this->terminal_settings = $terminalFeatures;
        } else if ($this->multicurrency2 == 'yes') {
            $terminalId = $this->publishable_key2;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key2;
            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);
            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();
            $this->terminal_settings = $terminalFeatures;
        } else if ($this->multicurrency3 == 'yes') {
            $terminalId = $this->publishable_key3;
            $customFieldLanguage = 'en-US';
            $secret = $this->secret_key3;
            $XmlTerminalFeatures = new NuveiGatewayXmlTerminalFeaturesRequest($terminalId, $customFieldLanguage);
            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlTerminalFeatures->ProcessRequestToGateway($secret, $serverUrl);
            $terminalFeatures = $response->getSettings();
            $this->terminal_settings = $terminalFeatures;
        }
    }

    function applepaysession_controller( WP_REST_Request $request ) {
        $options = get_option("woocommerce_nuvei_settings");
        $env = "live_";
        if($options['testmode'] == "yes")
            $env = "test_";

        $validationURL = "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession";

        $soap = curl_init();

        $data_string = json_encode([
            "merchantIdentifier" => $options[$env.'applepay_merchant_identifier'],
            "displayName"=> $options[$env.'applepay_display_name'],
            "initiative"=> "web",
            "initiativeContext"=> $options[$env.'applepay_initiative_context']
        ]);

        curl_setopt($soap, CURLOPT_URL, $validationURL);
        curl_setopt($soap, CURLOPT_SSLCERTTYPE,"PEM");
        curl_setopt($soap, CURLOPT_SSLCERT ,  __DIR__ . "/certificates/applemid.pem");
        curl_setopt($soap, CURLOPT_SSLKEY ,  __DIR__ . "/certificates/applemid.key");
        curl_setopt($soap, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($soap, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($soap, CURLOPT_CONNECTTIMEOUT, 20);
        curl_setopt($soap, CURLOPT_TIMEOUT,        15);
        curl_setopt($soap, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($soap, CURLOPT_POST,           true);
        curl_setopt($soap, CURLOPT_POSTFIELDS,     $data_string);
        curl_setopt($soap, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json',
                'Content-Length: ' . strlen($data_string))
        );

        $result = curl_exec($soap);

        if (curl_errno($soap) > 0) {
            $result = array('errocurl' => curl_errno($soap), 'msgcurl' => curl_error($soap));
        }

        curl_close($soap);

        return $result;
    }

    public function woocommerce_nuvei_product_options_general_product_data() {
        if ( !class_exists( 'WC_Subscriptions_Product' ) ) return;

        global $post;

        $chosen_price        = get_post_meta( $post->ID, '_subscription_price', true );
        $chosen_interval     = get_post_meta( $post->ID, '_subscription_period_interval', true );
        $period_count     = intval(get_post_meta( $post->ID, '_subscription_period_count', true ));
        $on_update     = str_replace(' ', '', get_post_meta( $post->ID, '_subscription_on_update', true ));
        $on_delete     = str_replace(' ', '', get_post_meta( $post->ID, '_subscription_on_delete', true ));

        $chosen_trial_length = WC_Subscriptions_Product::get_trial_length( $post->ID );
        $chosen_trial_period = WC_Subscriptions_Product::get_trial_period( $post->ID );

        $price_tooltip = __( 'Choose the subscription price, billing interval and period.', 'woocommerce-subscriptions' );
        // translators: placeholder is trial period validation message if passed an invalid value (e.g. "Trial period can not exceed 4 weeks")
        $trial_tooltip = sprintf( _x( 'An optional period of time to wait before charging the first recurring payment. Any sign up fee will still be charged at the outset of the subscription. %s', 'Trial period field tooltip on Edit Product administration screen', 'woocommerce-subscriptions' ), WC_Subscriptions_Admin::get_trial_period_validation_message() );

        // Set month as the default billing period
        $defaultPeriod = false;
        if ( ! $chosen_period = get_post_meta( $post->ID, '_subscription_period', true ) ) {
            $chosen_period = 'month';
            $defaultPeriod = true;
        }

        echo '<div class="options_group subscription_pricing show_if_subscription hidden">';

        $subscription_period_interval_strings = ["1" => "every"];
        $subscription_period_strings = [
                "weekly" => "week",
                "fortnightly" => "fortnight",
                "monthly" => "month",
                "quarterly" => "quarter",
                "yearly" => "year",
        ];


        // Subscription Price, Interval and Period
        ?><p class="form-field _subscription_price_fields _subscription_price_field">
        <label for="_subscription_price"><?php printf( esc_html__( 'Recurring Price (%s)', 'woocommerce-subscriptions' ), esc_html( get_woocommerce_currency_symbol() ) ); ?></label>
        <span class="wrap">
				<input type="text" id="_subscription_price" name="_subscription_price" class="wc_input_price wc_input_subscription_price" placeholder="<?php echo esc_attr_x( 'e.g. 5.90', 'example price', 'woocommerce-subscriptions' ); ?>" step="any" min="0" value="<?php echo esc_attr( wc_format_localized_price( $chosen_price ) ); ?>" />
				<label for="_subscription_period_interval" class="wcs_hidden_label"><?php esc_html_e( 'Subscription interval', 'woocommerce-subscriptions' ); ?></label>
				<select id="_subscription_period_interval" name="_subscription_period_interval" class="wc_input_subscription_period_interval">
				<?php foreach ( $subscription_period_interval_strings as $value => $label ) { ?>
                    <option value="<?php echo esc_attr( $value ); ?>" <?php selected( $value, $chosen_interval, true ) ?>><?php echo esc_html( $label ); ?></option>
                <?php } ?>
				</select>
				<label for="_subscription_period" class="wcs_hidden_label"><?php esc_html_e( 'Subscription period', 'woocommerce-subscriptions' ); ?></label>
				<select id="_subscription_period" name="_subscription_period" class="wc_input_subscription_period last" <?php if(!$defaultPeriod) echo 'disabled="disabled"';?> >
				<?php foreach ( $subscription_period_strings as $value => $label ) { ?>
                    <option value="<?php echo esc_attr( $value ); ?>" <?php selected( $value, $chosen_period, true ) ?>><?php echo esc_html( $label ); ?></option>
                <?php } ?>
				</select>
			</span>
        <?php echo wcs_help_tip( $price_tooltip ); ?>
        </p>

        <p class="form-field">
            <label for="_subscription_period_count">Period Count</label>
            <select id="_subscription_period_count" name="_subscription_period_count" class="select short">
                <option value="0">0 (unlimited)</option>
                <?php for($i = 1; $i <= 48; $i++) { ?>
                <option value="<?=$i?>" <?=($period_count === $i)?'selected="selected"':''?>><?=$i?></option>
                <?php } ?>
            </select>
        </p>

        <?php

        // Subscription Length
       /* woocommerce_wp_select( array(
                'id'          => '_subscription_length',
                'class'       => 'wc_input_subscription_length select short',
                'label'       => __( 'Period Count', 'woocommerce-subscriptions' ),
                'options'     => $wcs_get_subscription_ranges,
                'value' => '0',
                'desc_tip'    => true,
                'description' => __( 'Automatically expire the subscription after this length of time.', 'woocommerce-subscriptions' ),
            )
        );*/

        // Sign-up Fee
        woocommerce_wp_text_input( array(
            'id'          => '_subscription_sign_up_fee',
            // Keep wc_input_subscription_intial_price for backward compatibility.
            'class'       => 'wc_input_subscription_intial_price wc_input_subscription_initial_price wc_input_price  short',
            // translators: %s is a currency symbol / code
            'label'       => sprintf( __( 'Setup Price (%s)', 'woocommerce-subscriptions' ), get_woocommerce_currency_symbol() ),
            'placeholder' => _x( 'e.g. 9.90', 'example price', 'woocommerce-subscriptions' ),
            'description' => __( 'Optionally include an amount to be charged at the outset of the subscription. The sign-up fee will be charged immediately, even if the product has a free trial or the payment dates are synced.', 'woocommerce-subscriptions' ),
            'desc_tip'    => true,
            'type'        => 'text',
            'data_type'   => 'price',
            'custom_attributes' => array(
                'step' => 'any',
                'min'  => '0',
            ),
        ) );

        ?>


        <p class="form-field">
            <label for="_subscription_on_update">On Update</label>
            <select id="_subscription_on_update" name="_subscription_on_update" class="select short">
                <option value="CONTINUE" <?=($on_update === 'CONTINUE')?'selected="selected"':''?>>Continue Subscriptions</option>
                <option value="UPDATE" <?=($on_update === 'UPDATE')?'selected="selected"':''?>>Update Subscriptions</option>
            </select>
        </p>


        <p class="form-field">
            <label for="_subscription_on_delete">On Delete</label>
            <select id="_subscription_on_delete" name="_subscription_on_delete" class="select short">
                <option value="CONTINUE" <?=($on_delete === 'CONTINUE')?'selected="selected"':''?>>Continue Subscriptions</option>
                <option value="CANCEL" <?=($on_delete === 'CANCEL')?'selected="selected"':''?>>Finish Subscriptions</option>
            </select>
        </p>

        <p class="form-field _subscription_trial_length_field hidden">
            <label for="_subscription_trial_length"><?php esc_html_e( 'Free trial', 'woocommerce-subscriptions' ); ?></label>
            <span class="wrap">
                    <input type="text" id="_subscription_trial_length" name="_subscription_trial_length" class="wc_input_subscription_trial_length" value="0" />
                    <label for="_subscription_trial_period" class="wcs_hidden_label"><?php esc_html_e( 'Subscription Trial Period', 'woocommerce-subscriptions' ); ?></label>
                    <select id="_subscription_trial_period" name="_subscription_trial_period" class="wc_input_subscription_trial_period last" >
                        <?php foreach ( wcs_get_available_time_periods() as $value => $label ) { ?>
                            <option value="<?php echo esc_attr( $value ); ?>" <?php selected( $value, $chosen_trial_period, true ) ?>><?php echo esc_html( $label ); ?></option>
                        <?php } ?>
                    </select>
                </span>
            <?php echo wcs_help_tip( $trial_tooltip ); ?>
        </p>
        <?php


        do_action( 'woocommerce_subscriptions_product_options_pricing' );

        wp_nonce_field( 'wcs_subscription_meta', '_wcsnonce' );

        echo '</div>';
        echo '<div class="show_if_subscription clear"></div>';

        remove_action( 'woocommerce_product_options_general_product_data', array(WC_Subscriptions_Admin, 'subscription_pricing_fields') );
    }

	/**
     * Save meta data for simple subscription product type when the "Edit Product" form is submitted.
     *
     * @param array Array of Product types & their labels, excluding the Subscription product type.
     * @return array Array of Product types & their labels, including the Subscription product type.
     * @since 1.0
     */
	public static function woocommerce_nuvei_save_subscription_meta( $post_id ) {

        if ( empty( $_POST['_wcsnonce'] ) || ! wp_verify_nonce( $_POST['_wcsnonce'], 'wcs_subscription_meta' ) || $_POST['product-type'] !== 'subscription' ) {
            return;
        }

        $subscription_price = isset( $_REQUEST['_subscription_price'] ) ? wc_format_decimal( $_REQUEST['_subscription_price'] ) : '';
        $sale_price         = wc_format_decimal( $_REQUEST['_sale_price'] );

        update_post_meta( $post_id, '_subscription_price', $subscription_price );

        // Set sale details - these are ignored by WC core for the subscription product type
        update_post_meta( $post_id, '_regular_price', $subscription_price );
        update_post_meta( $post_id, '_sale_price', $sale_price );

        $site_offset = get_option( 'gmt_offset' ) * 3600;

        // Save the timestamps in UTC time, the way WC does it.
        $date_from = ( ! empty( $_POST['_sale_price_dates_from'] ) ) ? wcs_date_to_time( $_POST['_sale_price_dates_from'] ) - $site_offset : '';
        $date_to   = ( ! empty( $_POST['_sale_price_dates_to'] ) ) ? wcs_date_to_time( $_POST['_sale_price_dates_to'] ) - $site_offset : '';

        $now = gmdate( 'U' );

        if ( ! empty( $date_to ) && empty( $date_from ) ) {
            $date_from = $now;
        }

        update_post_meta( $post_id, '_sale_price_dates_from', $date_from );
        update_post_meta( $post_id, '_sale_price_dates_to', $date_to );

        // Update price if on sale
        if ( '' !== $sale_price && ( ( empty( $date_to ) && empty( $date_from ) ) || ( $date_from < $now && ( empty( $date_to ) || $date_to > $now ) ) ) ) {
            $price = $sale_price;
        } else {
            $price = $subscription_price;
        }

        update_post_meta( $post_id, '_price', stripslashes( $price ) );

        // Make sure trial period is within allowable range
        $subscription_ranges = wcs_get_subscription_ranges();

        $max_trial_length = count( $subscription_ranges[ $_POST['_subscription_trial_period'] ] ) - 1;

        $_POST['_subscription_trial_length'] = absint( $_POST['_subscription_trial_length'] );

        if ( $_POST['_subscription_trial_length'] > $max_trial_length ) {
            $_POST['_subscription_trial_length'] = $max_trial_length;
        }

        update_post_meta( $post_id, '_subscription_trial_length', $_POST['_subscription_trial_length'] );

        update_post_meta( $post_id, '_subscription_length', wc_clean(wp_unslash($_POST['_subscription_period_count'])));
        update_post_meta( $post_id, '_subscription_period_count', wc_clean(wp_unslash($_POST['_subscription_period_count'])) );
        update_post_meta( $post_id, '_subscription_on_update', wc_clean(wp_unslash($_POST['_subscription_on_update'])) );
        update_post_meta( $post_id, '_subscription_on_delete', wc_clean(wp_unslash($_POST['_subscription_on_delete'])) );


        $_REQUEST['_subscription_sign_up_fee']       = wc_format_decimal( $_REQUEST['_subscription_sign_up_fee'] );
        $_REQUEST['_subscription_one_time_shipping'] = isset( $_REQUEST['_subscription_one_time_shipping'] ) ? 'yes' : 'no';

        $subscription_fields = array(
            '_subscription_sign_up_fee',
            '_subscription_period',
            '_subscription_period_interval',
            '_subscription_length',
            '_subscription_trial_period',
            '_subscription_limit',
            '_subscription_one_time_shipping',
        );

        foreach ( $subscription_fields as $field_name ) {
            if ( isset( $_REQUEST[ $field_name ] ) ) {
                update_post_meta( $post_id, $field_name, stripslashes( $_REQUEST[ $field_name ] ) );
            }
        }

        remove_action( 'save_post', array(WC_Subscriptions_Admin, 'save_subscription_meta') );
    }

    function woocommerce_nuvei_stored_subscription_delete( $postid, $post ) {
        $post_meta = get_post_meta( $post->ID );

        $options = get_option("woocommerce_nuvei_settings");

        $env = "live_";
        if($options['testmode'] == "yes")
            $env = "test_";

        $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';

        if(isset($post->post_type) && $post->post_type == 'shop_subscription') { //customer subscription
            $orderPostId = $post->post_parent;

            $merchantRef = array_pop(get_post_meta( $orderPostId, 'subscriptionMerchantRef'));
            $terminalId = array_pop(get_post_meta( $orderPostId, 'terminalId'));

            if(!$merchantRef || !$terminalId) return;

            if($terminalId == $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $secret = $options[$env.'secret_key'];
            } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $secret = $options[$env.'secret_key2'];
            }  else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $secret = $options[$env.'secret_key3'];
            }


            $XmlSubscriptionDelRequest = new NuveiXmlSubscriptionDelRequest($merchantRef, $terminalId);
            $response = $XmlSubscriptionDelRequest->ProcessRequestToGateway($secret, $serverUrl);
        } else {
            if(!isset($post_meta['_subscription_price'])) return;

            $merchantRef = array_pop(get_post_meta( $post->ID, 'merchantRef'));
            $terminalId = array_pop(get_post_meta( $post->ID, 'terminalId'));

            if($terminalId == $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $secret = $options[$env.'secret_key'];
            } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $secret = $options[$env.'secret_key2'];
            }  else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $secret = $options[$env.'secret_key3'];
            }


            $XmlStoredSubscriptionDelRequest = new NuveiXmlStoredSubscriptionDelRequest($merchantRef, $terminalId);
            $response = $XmlStoredSubscriptionDelRequest->ProcessRequestToGateway($secret, $serverUrl);
        }

        if (isset($response) && $response->IsError()) {
            wp_die($response->ErrorString());
        } else {
            return;
        }
    }

    function woocommerce_nuvei_stored_subscription_duplicate( $meta_id, $post_id, $meta_key, $meta_value ) {
	    if($meta_key === "merchantRef") {
            update_post_meta( $post_id, 'merchantRef', null );
        }
	    return null;
    }

    function woocommerce_nuvei_subscription_update( $post_id, $post ) {
	    if($_GET['action'] != 'cancelled' && $_GET['change_subscription_to'] != "cancelled") return;

        $options = get_option("woocommerce_nuvei_settings");

        $env = "live_";
        if($options['testmode'] == "yes")
            $env = "test_";

        $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';

        if(isset($post->post_type) && $post->post_type == 'shop_subscription') {
            $orderPostId = $post->post_parent;

            $merchantRef = array_pop(get_post_meta( $orderPostId, 'subscriptionMerchantRef'));
            $terminalId = array_pop(get_post_meta( $orderPostId, 'terminalId'));

            if($terminalId == $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $secret = $options[$env.'secret_key'];
            } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $secret = $options[$env.'secret_key2'];
            }  else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $secret = $options[$env.'secret_key3'];
            }

            if($_GET['action'] == 'cancelled' || $_GET['change_subscription_to'] == "cancelled") {
                $XmlSubscriptionCancelRequest = new NuveiXmlSubscriptionCancelRequest($merchantRef, $terminalId);
                $response = $XmlSubscriptionCancelRequest->ProcessRequestToGateway($secret, $serverUrl);
            }
        }

        if ($response->IsError()) {
            wp_die($response->ErrorString());
        } else {
            return;
        }
    }

    private function floatvalue($val){
        $val = str_replace(",",".",$val);
        $val = preg_replace('/\.(?=.*\.)/', '', $val);
        return floatval($val);
    }

    public function woocommerce_nuvei_stored_subscription_management( $product_id, $product ) {
        $productType = wc_clean(wp_unslash($_POST['product-type']));
        if($productType !== 'subscription') return;

        $merchantRef = $product->get_meta("merchantRef");

        $options = get_option("woocommerce_nuvei_settings");
        $currency = get_option('woocommerce_currency');

        $env = "live_";
        if($options['testmode'] == "yes")
            $env = "test_";

        $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';

        $name = wc_clean(wp_unslash($_POST['post_title']));
        $description = wc_clean(wp_unslash($_POST['content']));
        $periodType = wc_clean(wp_unslash(strtoupper($_POST['_subscription_period'])));
        $length = wc_clean(wp_unslash($_POST['_subscription_period_count']));
        $recurringAmount = number_format(wc_clean(wp_unslash($this->floatvalue($_POST['_subscription_price']))), 2, '.', '');
        $initialAmount = number_format(wc_clean(wp_unslash($this->floatvalue($_POST['_subscription_sign_up_fee']))), 2, '.', '');
        $type = "AUTOMATIC";
        $onUpdate = wc_clean(wp_unslash($_POST['_subscription_on_update']));
        $onDelete = wc_clean(wp_unslash($_POST['_subscription_on_delete']));

        if($description === '') $description = 'none';

        if($merchantRef) {

            $terminalId = $product->get_meta("terminalId");

            if($terminalId == $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $secret = $options[$env.'secret_key'];
            } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $secret = $options[$env.'secret_key2'];
            }  else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $secret = $options[$env.'secret_key3'];
            }

            $XmlStoredSubscriptionUpdRequest = new NuveiXmlStoredSubscriptionUpdRequest($merchantRef,
                    $terminalId,
                    $name,
                    $description,
                    $length,
                    $currency,
                    $recurringAmount,
                    $initialAmount,
                    $type,
                    $onUpdate,
                    $onDelete);

            $response = $XmlStoredSubscriptionUpdRequest->ProcessRequestToGateway($secret, $serverUrl);

        } else {
            if(!$periodType) $periodType = strtoupper($product->get_meta("_subscription_period"));

            if($currency == $options[$env.'currency'] && $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $terminalId = $options[$env.'publishable_key'];
                $secret = $options[$env.'secret_key'];
            } else if($currency == $options[$env.'currency2'] && $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $terminalId = $options[$env.'publishable_key2'];
                $secret = $options[$env.'secret_key2'];
            }  else if($currency == $options[$env.'currency3'] && $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $terminalId = $options[$env.'publishable_key3'];
                $secret = $options[$env.'secret_key3'];
            } else if ($options[$env.'multicurrency'] == 'yes') {
                $terminalId = $options[$env.'publishable_key'];
                $secret = $options[$env.'secret_key'];
            } else if ($options[$env.'multicurrency2'] == 'yes') {
                $terminalId = $options[$env.'publishable_key2'];
                $secret = $options[$env.'secret_key2'];
            } else if ($options[$env.'multicurrency3'] == 'yes') {
                $terminalId = $options[$env.'publishable_key3'];
                $secret = $options[$env.'secret_key3'];
            }

            $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $name . $description . date('U'));

            $XmlStoredSubscriptionRegRequest = new NuveiXmlStoredSubscriptionRegRequest($merchantRef,
                    $terminalId,
                    $name,
                    $description,
                    $periodType,
                    $length,
                    $currency,
                    $recurringAmount,
                    $initialAmount,
                    $type,
                    $onUpdate,
                    $onDelete);

            $response = $XmlStoredSubscriptionRegRequest->ProcessRequestToGateway($secret, $serverUrl);
        }

        if ($response->IsError()) {
            $nuveiResponse .= 'AN ERROR OCCURED! Error details: ' . $response->ErrorString();

            wp_die($nuveiResponse);
        } else {
            $product->update_meta_data( 'merchantRef', $merchantRef);
            $product->update_meta_data( 'terminalId', $terminalId);

            remove_action('woocommerce_update_product', array( $this, 'woocommerce_nuvei_stored_subscription_management'), 10, 2);
            $product->save();
            add_action('woocommerce_update_product', array( $this, 'woocommerce_nuvei_stored_subscription_management'), 10, 2);
        }
    }

    public function process_subscription($order, $product, $secureCardMerchantRef, $terminalId, $secret) {
        $options = get_option("woocommerce_nuvei_settings");

        $storedSubscriptionRef = $product->get_meta('merchantRef');
        $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $storedSubscriptionRef . $secureCardMerchantRef . date('U'));
        $startDate = date('d-m-Y');

        $XmlSubscriptionRegRequest = new NuveiXmlSubscriptionRegRequest($merchantRef, $terminalId, $storedSubscriptionRef, $secureCardMerchantRef, $startDate);

        $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
        $response = $XmlSubscriptionRegRequest->ProcessRequestToGateway($secret, $serverUrl);

        if ($response->IsError()) {
            $nuveiResponse = 'AN ERROR OCCURED! Error details: ' . $response->ErrorString();
            wc_add_notice( $nuveiResponse, 'error' );
            return false;
        } else {
            $order->add_order_note( $product->get_title() . ' subscription added #'. $response->MerchantReference() );
            $order->save();
            return true;
        }
    }

    public function add_payment_method_reg_request($terminalId, $secret, $cardHolderName, $cardNumber, $cardExpiry, $cardType, $cvv, $last4, $month, $year, $address1, $postcode, $email, $phone) {
        $options = get_option("woocommerce_nuvei_settings");

        $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $last4 . $cardExpiry . $cardHolderName . date('U'));

        $XmlSecureCardRegRequest = new NuveiXmlSecureCardRegRequest($merchantRef, $terminalId, $cardNumber, $cardExpiry, $cardType, $cardHolderName);
        $XmlSecureCardRegRequest->SetCvv($cvv);
        $XmlSecureCardRegRequest->SetAddress1($address1);
        $XmlSecureCardRegRequest->SetPostcode($postcode);
        $XmlSecureCardRegRequest->SetEmail($email);
        $XmlSecureCardRegRequest->SetPhone($phone);

        $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
        $response = $XmlSecureCardRegRequest->ProcessRequestToGateway($secret, $serverUrl);

        $nuveiResponse = '';
        $securecard_added = false;

        if ($response->IsError()) {
            $nuveiResponse .= 'AN ERROR OCCURED! Error details: ' . $response->ErrorString();
        } else {
            $nuveiResponse .= 'Secure Card added successfully.';
            $token = $response->CardReference();
            $securecard_added = true;
        }

        if($securecard_added) {
            $wc_token = new WC_Nuvei_Payment_Token_CC();
            $wc_token->set_token( $token );
            $wc_token->set_gateway_id( 'nuvei' );
            $wc_token->set_card_type( strtolower( $cardType ) );
            $wc_token->set_last4( $last4 );
            $wc_token->set_expiry_month( $month );
            $wc_token->set_expiry_year( $year );
            $wc_token->set_merchant_ref( $merchantRef );
            $wc_token->set_terminal_id( $terminalId );

            $wc_token->set_user_id( get_current_user_id() );
            $wc_token->save();

            $return = [
                "cardReference" => $response->CardReference(),
                "merchantReference" => $response->MerchantReference(),
            ];

            return $return;
        } else {
            $return = [
                "error" => true,
                "error_msg" => $nuveiResponse,
            ];

            return $return;
        }
    }

    public function check3DSResponse() {
        if(isset($_GET['ORDERID'])) {
            session_start();
            $order_id = absint($_GET['ORDERID']);

            $cardDetails = $_SESSION['wc_gateway_nuvei_'.$order_id];

            $checkSum = md5($cardDetails['testmode'] . ':' . $cardDetails['avs'] . ':'
                . $cardDetails['multicurrency'] . ':' . $cardDetails['terminalId'] . ':' . $cardDetails['secret']
                . ':' . $cardDetails['currency'] . ':' . $cardDetails['amount'] . ':'  . $cardDetails['cardNumber']
                . ':' . $cardDetails['cardHolder'] . ':' . $cardDetails['cardExpiry'] . ':' . $cardDetails['cardType']
                . ':' . $cardDetails['cvv'] . ':' . $cardDetails['orderHasSubscription'] );

            $expectedHash = md5 ($_GET['RESULT'] . (isset($_GET['MPIREF'])?$_GET['MPIREF']:$_GET['TERMINALID']) . $_GET['ORDERID'] . $_GET['DATETIME'] . $cardDetails['secret']);

            if(!hash_equals($checkSum, $cardDetails['checkSum']) || !hash_equals($expectedHash, $_GET['HASH'])) {
                wc_add_notice( __('There\'s an issue with your cart session. Please try again.'), 'error' );
                return;
            }

            $order = wc_get_order($order_id);

            if(isset($_GET['RESULT']) && sanitize_text_field($_GET['RESULT']) == 'D') {
                $orderStatus = $order->get_status();
                $orderStatus = 'wc-' === substr( $orderStatus, 0, 3 ) ? substr( $orderStatus, 3 ) : $orderStatus;

                $receiptPageUrl = $order->get_checkout_order_received_url();

                if($orderStatus != 'failed') {
                    $order->update_status(apply_filters('woocommerce_gateway_nuvei_process_payment_order_status', 'failed', $order), __('3DS failed; STATUS='.sanitize_text_field($_GET['STATUS']).'; ECI='.sanitize_text_field($_GET['ECI']), 'woocommerce'));

                    // Remove cart
                    WC()->cart->empty_cart();
                    $_SESSION['wc_gateway_nuvei_'.$order_id] = '';
                    unset($_SESSION['wc_gateway_nuvei_'.$order_id]);
                }

                wp_redirect($receiptPageUrl);
            } else if(isset($_GET['RESULT']) && (sanitize_text_field($_GET['RESULT']) == 'A' || (sanitize_text_field($_GET['RESULT']) == 'E' && isset($_GET['ERRORCODE']) && sanitize_text_field($_GET['ERRORCODE']) == '3'))) {
                $this->get_terminal_settings();

                $testmode = $cardDetails['testmode'];
                $avs = $cardDetails['avs'];
                $multicurrency = $cardDetails['multicurrency'];
                $terminalId = $cardDetails['terminalId'];
                $secret = $cardDetails['secret'];
                $currency = $cardDetails['currency'];
                $amount = $cardDetails['amount'];
                $cardNumber = $cardDetails['cardNumber'];
                $cardHolder = $cardDetails['cardHolder'];
                $cardExpiry = $cardDetails['cardExpiry'];
                $cardType = $cardDetails['cardType'];
                $cvv = $cardDetails['cvv'];

                if($cardDetails['orderHasSubscription']) {
                    $last4 = substr($cardNumber, -4);
                    $month = substr($cardExpiry, 0, 2);
                    $year = '20' . substr($cardExpiry, -2);

                    $address1 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_1 : $order->get_billing_address_1();
                    $postcode = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_postcode : $order->get_billing_postcode();
                    $email = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_email : $order->get_billing_email();
                    $phone = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_phone : $order->get_billing_phone();

                    $regRequest = $this->add_payment_method_reg_request($terminalId, $secret, $cardHolder, $cardNumber, $cardExpiry, $cardType, $cvv, $last4, $month, $year, $address1, $postcode, $email, $phone);
                    $cardNumber = $regRequest['cardReference'];
                    $merchantReference = $regRequest['merchantReference'];

                    $cardType = 'SECURECARD';

                    if(isset($regRequest['error'])) {
                        wc_add_notice( $regRequest['error_msg'], 'error' );
                        return;
                    }

                    if($cardNumber === false) return;

                    //add subscriptions
                    foreach ( WC()->cart->get_cart() as $item ) {
                        if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                            $product = wc_get_product( $item['product_id'] );

                            if(!$this->process_subscription($order, $product, $merchantReference, $terminalId, $secret)) {
                                return;
                            } else {
                                $amount -= $product->get_meta('_subscription_sign_up_fee');
                                $amount -= $product->get_meta('_subscription_price');
                            }
                        }
                    }
                }

                $receiptPageUrl = $order->get_checkout_order_received_url();

                if($amount <= 0 && $cardDetails['orderHasSubscription']) {
                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Order successfully processed.', 'woocommerce' ) );

                    $order->save();

                    WC()->mailer()->customer_invoice( $order );

                    wc_reduce_stock_levels( $order_id );

                    WC()->cart->empty_cart();

                    wp_redirect($receiptPageUrl);
                    return;
                }

                $XmlAuthRequest = new NuveiGatewayXmlAuthRequest($terminalId, $order_id, $currency, $amount, $cardNumber, $cardType);

                $XmlAuthRequest->SetTransactionType("5");

                if ($cardType != "SECURECARD") $XmlAuthRequest->SetNonSecureCardCardInfo($cardExpiry, $cardHolder);
                if ($cvv != "") $XmlAuthRequest->SetCvv($cvv);
                if ($multicurrency=='yes') $XmlAuthRequest->SetMultiCur();
                if (isset($_GET['MPIREF'])) $XmlAuthRequest->SetMpiRef(wc_clean(wp_unslash($_GET['MPIREF'])));
                if (isset($_GET['XID'])) $XmlAuthRequest->SetXid(wc_clean(wp_unslash($_GET['XID'])));
                if (isset($_GET['CAVV'])) $XmlAuthRequest->SetCavv(wc_clean(wp_unslash($_GET['CAVV'])));


                if(true || $avs) { //always send AVS data on xml requests and let gateway decide if will use it or not
                    $options = get_option("woocommerce_nuvei_settings");

                    $address1 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_1 : $order->get_billing_address_1();
                    $address2 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_2 : $order->get_billing_address_2();
                    $postcode = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_postcode : $order->get_billing_postcode();
                    $city = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_city : $order->get_billing_city();
                    $region = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_state : $order->get_billing_state();
                    $country = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_country : $order->get_billing_country();
                    $email = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_email : $order->get_billing_email();
                    $phone = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_phone : $order->get_billing_phone();


                    $XmlAuthRequest->SetAvs($address1, $address2, $postcode);
                    $XmlAuthRequest->SetCity($city);
                    if($region != "") $XmlAuthRequest->SetRegion($region);
                    $XmlAuthRequest->SetCountry($country);
                    $XmlAuthRequest->SetEmail($email);
                    $XmlAuthRequest->SetPhone($phone);

                    $ipAddress = false;
                    if (!empty($_SERVER['HTTP_CLIENT_IP']) && filter_var($_SERVER['HTTP_CLIENT_IP'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $_SERVER['HTTP_CLIENT_IP'];
                    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                        if(is_array($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                            for($i = 0; $i < count($_SERVER['HTTP_X_FORWARDED_FOR']); $i++) {
                                if(filter_var($_SERVER['HTTP_X_FORWARDED_FOR'][$i], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                                    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'][$i];
                                    break;
                                }
                            }
                        } elseif(filter_var($_SERVER['HTTP_X_FORWARDED_FOR'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                            $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
                        }
                    }
                    if(!$ipAddress && filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $_SERVER['REMOTE_ADDR'];
                    } elseif(filter_var($options['default_ip'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $options['default_ip'];
                    }
                    if($ipAddress) $XmlAuthRequest->SetIPAddress($ipAddress);
                }

                # Perform the online authorisation and read in the result
                $serverUrl = $testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
                $response = $XmlAuthRequest->ProcessRequestToGateway($secret, $serverUrl);

                $expectedResponseHash = md5($terminalId . $response->UniqueRef() . ($multicurrency=='yes' ? $currency : '')  . $amount . $response->DateTime() . $response->ResponseCode() . $response->ResponseText() . $secret);
                $isHashCorrect = ($expectedResponseHash == $response->Hash());

                $nuveiResponse = '';

                if ($response->IsError()) $nuveiResponse .= 'AN ERROR OCCURED! Your transaction was not processed. Error details: ' . $response->ErrorString();
                elseif ($isHashCorrect) {
                    switch ($response->ResponseCode()) {
                        case "A" :    # -- If using local database, update order as Authorised.
                            $nuveiResponse .= 'Payment Processed successfully. Thanks you for your order.';
                            $uniqueRef = $response->UniqueRef();
                            $responseText = $response->ResponseText();
                            $approvalCode = $response->ApprovalCode();
                            $avsResponse = $response->AvsResponse();
                            $cvvResponse = $response->CvvResponse();
                            break;
                        case "R" :
                        case "D" :
                        case "C" :
                        case "S" :
                        default  :    # -- If using local database, update order as declined/failed --
                            $nuveiResponse .= 'PAYMENT DECLINED! Please try again with another card. Bank response: ' . $response->ResponseText();
                    }
                } else {
                    $nuveiResponse .= 'PAYMENT FAILED: INVALID RESPONSE HASH. Please contact ' . $adminEmail . ' or call ' . $adminPhone . ' to clarify if you will get charged for this order.';
                    if ($response->UniqueRef()) $nuveiResponse .= 'Please quote Nuvei Terminal ID: ' . $terminalId . ', and Unique Reference: ' . $response->UniqueRef() . ' when mailing or calling.';
                }

                if (!$response->IsError() && $isHashCorrect && $response->ResponseCode() == 'A') {
                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Payment successfully processed #'. $response->UniqueRef(), 'woocommerce' ) );

                    $order->set_transaction_id( $response->UniqueRef() );

                    $order->save();

                    WC()->mailer()->customer_invoice( $order );

                    wc_reduce_stock_levels( $order_id );

                    WC()->cart->empty_cart();
                    $_SESSION['wc_gateway_nuvei_'.$order_id] = '';
                    unset($_SESSION['wc_gateway_nuvei_'.$order_id]);

                    wp_redirect($receiptPageUrl);
                }
                else {
                    $order->update_status(apply_filters('woocommerce_gateway_nuvei_process_payment_order_status', 'failed', $order), __('Payment failed: '.$nuveiResponse, 'woocommerce'));

                    // Remove cart
                    WC()->cart->empty_cart();
                    $_SESSION['wc_gateway_nuvei_'.$order_id] = '';
                    unset($_SESSION['wc_gateway_nuvei_'.$order_id]);

                    wp_redirect($receiptPageUrl);
                }

                return;
            }
        }
    }

    public function checkSecureCardRegisterResponse() {
        if(isset($_GET['CARDREFERENCE'])) {
            session_start();

            if(isset($_GET['RESPONSECODE']) && sanitize_text_field($_GET['RESPONSECODE']) !== 'A') {

                wc_add_notice( sanitize_text_field($_GET['RESPONSETEXT']), 'error' );

            } else if(isset($_GET['RESPONSECODE']) && sanitize_text_field($_GET['RESPONSECODE']) === 'A') {
                $this->get_terminal_settings();
                $options = get_option("woocommerce_nuvei_settings");

                $merchantRef = wc_clean(wp_unslash($_GET['MERCHANTREF']));
                $orderDetails =  $_SESSION['wc_gateway_nuvei_'.$merchantRef];
                $order_id = $orderDetails['orderId'];
                $terminalId = $orderDetails['terminalId'];

                $env = "live_";
                if($options['testmode'] == "yes")
                    $env = "test_";

                if($terminalId == $options[$env.'publishable_key'] && $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                    $terminalId = $options[$env.'publishable_key'];
                    $secret = $options[$env.'secret_key'];
                    $multicurrency = $options[$env.'multicurrency'];
                } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                    $terminalId = $options[$env.'publishable_key2'];
                    $secret = $options[$env.'secret_key2'];
                    $multicurrency = $options[$env.'multicurrency2'];
                } else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                    $terminalId = $options[$env.'publishable_key3'];
                    $secret = $options[$env.'secret_key3'];
                    $multicurrency = $options[$env.'multicurrency3'];
                }

                $expectedHash = md5 ($terminalId . $_GET['RESPONSECODE'] . $_GET['RESPONSETEXT'] . $_GET['MERCHANTREF'] . $_GET['CARDREFERENCE'] . $_GET['DATETIME'] . $secret);
                if(!hash_equals($expectedHash, $_GET['HASH'])) {
                    wc_add_notice( __('There was an issue with the server response.'), 'error' );
                    return;
                }

                $cardNumber = wc_clean(wp_unslash($_GET['MASKEDCARDNUMBER']));
                $cardExpiry = wc_clean(wp_unslash($_GET['CARDEXPIRY']));
                $last4 = substr($cardNumber, -4);
                $month = substr($cardExpiry, 0, 2);
                $year = '20' . substr($cardExpiry, -2);

                $token = wc_clean(wp_unslash($_GET['CARDREFERENCE']));
                $wc_token = new WC_Nuvei_Payment_Token_CC();
                $wc_token->set_token( $token );
                $wc_token->set_gateway_id( 'nuvei' );
                $wc_token->set_card_type( strtolower( wc_clean(wp_unslash($_GET['CARDTYPE'])) ) );
                $wc_token->set_last4( $last4 );
                $wc_token->set_expiry_month( $month );
                $wc_token->set_expiry_year( $year );
                $wc_token->set_merchant_ref( $merchantRef );
                $wc_token->set_terminal_id( $terminalId );

                $wc_token->set_user_id( get_current_user_id() );
                $wc_token->save();


                $order = wc_get_order($order_id);
                $currency = $order->get_currency();
                $orderTotal = $order->get_total();

                foreach ( WC()->cart->get_cart() as $item ) {
                    if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                        $product = wc_get_product( $item['product_id'] );

                        if(!$this->process_subscription($order, $product, $merchantRef, $terminalId, $secret)) {
                            return;
                        } else {
                            $orderTotal -= $product->get_meta('_subscription_sign_up_fee');
                            $orderTotal -= $product->get_meta('_subscription_price');
                        }
                    }
                }

                # Set up the authorisation object
                $amount = number_format(wc_clean(wp_unslash($orderTotal)), 2, '.', '');
                $cardNumber = $token;
                $cardType = 'SECURECARD';

                $receiptPageUrl = $order->get_checkout_order_received_url();

                if($amount <= 0) {
                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Order successfully processed.', 'woocommerce' ) );

                    $order->save();

                    WC()->mailer()->customer_invoice( $order );

                    wc_reduce_stock_levels( $order_id );

                    WC()->cart->empty_cart();
                    $_SESSION['wc_gateway_nuvei_'.$merchantRef] = '';
                    unset($_SESSION['wc_gateway_nuvei_'.$merchantRef]);

                    wp_redirect($receiptPageUrl);
                    return;
                }

                $XmlAuthRequest = new NuveiGatewayXmlAuthRequest($terminalId, $order_id, $currency, $amount, $cardNumber, $cardType);

                if ($multicurrency=='yes') $XmlAuthRequest->SetMultiCur();


                if(true || $options['avs']) { //always send AVS data on xml requests and let gateway decide if will use it or not
                    $address1 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_1 : $order->get_billing_address_1();
                    $address2 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_2 : $order->get_billing_address_2();
                    $postcode = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_postcode : $order->get_billing_postcode();
                    $city = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_city : $order->get_billing_city();
                    $region = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_state : $order->get_billing_state();
                    $country = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_country : $order->get_billing_country();
                    $email = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_email : $order->get_billing_email();
                    $phone = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_phone : $order->get_billing_phone();


                    $XmlAuthRequest->SetAvs($address1, $address2, $postcode);
                    $XmlAuthRequest->SetCity($city);
                    if($region != "") $XmlAuthRequest->SetRegion($region);
                    $XmlAuthRequest->SetCountry($country);
                    $XmlAuthRequest->SetEmail($email);
                    $XmlAuthRequest->SetPhone($phone);

                    $ipAddress = false;
                    if (!empty($_SERVER['HTTP_CLIENT_IP']) && filter_var($_SERVER['HTTP_CLIENT_IP'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $_SERVER['HTTP_CLIENT_IP'];
                    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                        if(is_array($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                            for($i = 0; $i < count($_SERVER['HTTP_X_FORWARDED_FOR']); $i++) {
                                if(filter_var($_SERVER['HTTP_X_FORWARDED_FOR'][$i], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                                    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'][$i];
                                    break;
                                }
                            }
                        } elseif(filter_var($_SERVER['HTTP_X_FORWARDED_FOR'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                            $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
                        }
                    }
                    if(!$ipAddress && filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $_SERVER['REMOTE_ADDR'];
                    } elseif(filter_var($options['default_ip'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $ipAddress = $options['default_ip'];
                    }
                    if($ipAddress) $XmlAuthRequest->SetIPAddress($ipAddress);
                }

                # Perform the online authorisation and read in the result
                $serverUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
                $response = $XmlAuthRequest->ProcessRequestToGateway($secret, $serverUrl);

                $expectedResponseHash = md5($terminalId . $response->UniqueRef() . ($multicurrency=='yes' ? $currency : '')  . $amount . $response->DateTime() . $response->ResponseCode() . $response->ResponseText() . $secret);
                $isHashCorrect = ($expectedResponseHash == $response->Hash());

                $nuveiResponse = '';

                if ($response->IsError()) $nuveiResponse .= 'AN ERROR OCCURED! Your transaction was not processed. Error details: ' . $response->ErrorString();
                elseif ($isHashCorrect) {
                    switch ($response->ResponseCode()) {
                        case "A" :    # -- If using local database, update order as Authorised.
                            $nuveiResponse .= 'Payment Processed successfully. Thanks you for your order.';
                            $uniqueRef = $response->UniqueRef();
                            $responseText = $response->ResponseText();
                            $approvalCode = $response->ApprovalCode();
                            $avsResponse = $response->AvsResponse();
                            $cvvResponse = $response->CvvResponse();
                            break;
                        case "R" :
                        case "D" :
                        case "C" :
                        case "S" :
                        default  :    # -- If using local database, update order as declined/failed --
                            $nuveiResponse .= 'PAYMENT DECLINED! Please try again with another card. Bank response: ' . $response->ResponseText();
                    }
                } else {
                    $nuveiResponse .= 'PAYMENT FAILED: INVALID RESPONSE HASH. Please contact ' . $adminEmail . ' or call ' . $adminPhone . ' to clarify if you will get charged for this order.';
                    if ($response->UniqueRef()) $nuveiResponse .= 'Please quote Nuvei Terminal ID: ' . $terminalId . ', and Unique Reference: ' . $response->UniqueRef() . ' when mailing or calling.';
                }

                if (!$response->IsError() && $isHashCorrect && $response->ResponseCode() == 'A') {

                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Payment successfully processed #'. $response->UniqueRef(), 'woocommerce' ) );

                    $order->set_transaction_id( $response->UniqueRef() );

                    $order->save();

                    WC()->mailer()->customer_invoice( $order );

                    wc_reduce_stock_levels( $order_id );

                    WC()->cart->empty_cart();
                    $_SESSION['wc_gateway_nuvei_'.$merchantRef] = '';
                    unset($_SESSION['wc_gateway_nuvei_'.$merchantRef]);

                    wp_redirect($receiptPageUrl);
                }
                else {
                    wc_add_notice( $nuveiResponse, 'error' );
                }
            }
        }
    }

    public function checkResponse() {
        if (isset($_GET['ORDERID']) && wc_clean(wp_unslash($_GET['ORDERID'])) && isset($_GET['HASH']) && wc_clean(wp_unslash($_GET['HASH']))) {
            $options = get_option("woocommerce_nuvei_settings");

            $env = "live_";
            if($options['testmode'] == "yes")
                $env = "test_";

            $terminalId = wc_clean(wp_unslash($_GET['TERMINALID']));
            if($terminalId == $options[$env.'publishable_key'] && $options[$env.'publishable_key'] && $options[$env.'secret_key']) {
                $terminalId = $options[$env.'publishable_key'];
                $secret = $options[$env.'secret_key'];
                $currency = $options[$env.'currency'];
                $multicurrency = $options[$env.'multicurrency'];
            } else if($terminalId == $options[$env.'publishable_key2'] && $options[$env.'publishable_key2'] && $options[$env.'secret_key2']) {
                $terminalId = $options[$env.'publishable_key2'];
                $secret = $options[$env.'secret_key2'];
                $currency = $options[$env.'currency2'];
                $multicurrency = $options[$env.'multicurrency2'];
            } else if($terminalId == $options[$env.'publishable_key3'] && $options[$env.'publishable_key3'] && $options[$env.'secret_key3']) {
                $terminalId = $options[$env.'publishable_key3'];
                $secret = $options[$env.'secret_key3'];
                $currency = $options[$env.'currency3'];
                $multicurrency = $options[$env.'multicurrency3'];
            }

            $expectedHash = md5($terminalId . $_GET['ORDERID'] . ($multicurrency=='yes' ? $currency : '') . $_GET['AMOUNT'] . $_GET['DATETIME'] . $_GET['RESPONSECODE'] . $_GET['RESPONSETEXT'] . $secret );

            $securecardStored = false;
            if (isset($_GET['SECURECARDMERCHANTREF']) && wc_clean(wp_unslash($_GET['SECURECARDMERCHANTREF']))
                && isset($_GET['ISSTORED']) && wc_clean(wp_unslash($_GET['ISSTORED'])) == true
                && isset($_GET['CARDTYPE']) && wc_clean(wp_unslash($_GET['CARDTYPE']))
                && isset($_GET['CARDNUMBER']) && wc_clean(wp_unslash($_GET['CARDNUMBER']))
                && isset($_GET['CARDREFERENCE']) && wc_clean(wp_unslash($_GET['CARDREFERENCE']))
                && isset($_GET['CARDEXPIRY']) && wc_clean(wp_unslash($_GET['CARDEXPIRY']))
                && isset($_GET['MERCHANTREF']) && wc_clean(wp_unslash($_GET['MERCHANTREF']))
                && wc_clean(wp_unslash($_GET['SECURECARDMERCHANTREF'])) == wc_clean(wp_unslash($_GET['MERCHANTREF']))
            ) {
                $securecardStored = true;
                $expectedHash = md5($terminalId . $_GET['ORDERID'] . ($multicurrency=='yes' ? $currency : '') . $_GET['AMOUNT'] . $_GET['DATETIME'] . $_GET['RESPONSECODE'] . $_GET['RESPONSETEXT'] . $secret
                                    . $_GET['MERCHANTREF'] . $_GET['CARDREFERENCE'] . $_GET['CARDTYPE'] . $_GET['CARDNUMBER'] . $_GET['CARDEXPIRY'] );
            }

            if (sanitize_text_field($_GET['RESPONSECODE']) == 'A' && hash_equals($expectedHash, $_GET['HASH'])) {
                $order_id = wc_get_order_id_by_order_key(urldecode($_GET['key']));
                $order = wc_get_order($order_id);
                $orderStatus = $order->get_status();
                $orderStatus = 'wc-' === substr( $orderStatus, 0, 3 ) ? substr( $orderStatus, 3 ) : $orderStatus;

                if($orderStatus == 'pending' || $orderStatus == 'failed') {
                    if ($securecardStored) {
                        $cardNumber = wc_clean(wp_unslash($_GET['CARDNUMBER']));
                        $cardExpiry = wc_clean(wp_unslash($_GET['CARDEXPIRY']));
                        $last4 = substr($cardNumber, -4);
                        $month = substr($cardExpiry, 0, 2);
                        $year = '20' . substr($cardExpiry, -2);

                        $wc_token = new WC_Nuvei_Payment_Token_CC();
                        $wc_token->set_token( wc_clean(wp_unslash($_GET['CARDREFERENCE'])) );
                        $wc_token->set_gateway_id( 'nuvei' );
                        $wc_token->set_card_type( strtolower( wc_clean(wp_unslash($_GET['CARDTYPE'])) ) );
                        $wc_token->set_last4( $last4 );
                        $wc_token->set_expiry_month( $month );
                        $wc_token->set_expiry_year( $year );
                        $wc_token->set_merchant_ref( wc_clean(wp_unslash($_GET['SECURECARDMERCHANTREF'])) );
                        $wc_token->set_terminal_id( wc_clean(wp_unslash($_GET['TERMINALID'])) );

                        $wc_token->set_user_id( get_current_user_id() );
                        $wc_token->save();
                    }

                    $order->update_status(apply_filters('woocommerce_order_status_pending_to_processing_notification', 'processing', $order), __('Payment processed correctly #' . sanitize_text_field($_GET['UNIQUEREF']), 'woocommerce'));

                    $order->set_transaction_id( sanitize_text_field($_GET['UNIQUEREF']) );

                    $order->save();

                    WC()->mailer()->customer_invoice($order);

                    wc_reduce_stock_levels( $order_id );

                    // Remove cart
                    WC()->cart->empty_cart();

                    // Redirect merchant to receipt page
                    $receiptPageUrl = $order->get_checkout_order_received_url();
                    wp_redirect($receiptPageUrl);
                }
            } else {
                $currentUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";

                $order_id = wc_get_order_id_by_order_key(urldecode($_GET['key']));
                $order = wc_get_order($order_id);
                $orderStatus = $order->get_status();
                $orderStatus = 'wc-' === substr( $orderStatus, 0, 3 ) ? substr( $orderStatus, 3 ) : $orderStatus;


                if($orderStatus == 'pending') {
                    $order->update_status(apply_filters('woocommerce_gateway_nuvei_process_payment_order_status', 'failed', $order), __('Payment failed #' . sanitize_text_field($_GET['UNIQUEREF']), 'woocommerce'));

                    // Remove cart
                    WC()->cart->empty_cart();

                    wp_redirect($currentUrl);
                }
            }
        }
    }

    public function send_new_order_email( $order_id ) {
        $emails = WC()->mailer()->get_emails();
        if ( ! empty( $emails ) && ! empty( $order_id ) ) {
            $emails['WC_Email_New_Order']->trigger( $order_id );
            $emails['WC_Email_Customer_Processing_Order']->trigger( $order_id );
        }
    }

    public function send_failed_order_email( $order_id ) {
        $emails = WC()->mailer()->get_emails();
        if ( ! empty( $emails ) && ! empty( $order_id ) ) {
            $emails['WC_Email_Failed_Order']->trigger( $order_id );
        }
    }



    /**
     * Allow this class and other classes to add slug keyed notices (to avoid duplication)
     */
    public function add_admin_notice( $slug, $class, $message ) {
        $this->notices[ $slug ] = array(
            'class'   => $class,
            'message' => $message,
        );
    }

    /**
     * The backup sanity check, in case the plugin is activated in a weird way,
     * or the environment changes after activation. Also handles upgrade routines.
     */
    public function check_environment() {
        if ( ! defined( 'IFRAME_REQUEST' ) && ( Nuvei_Gateway_for_WC_VERSION !== get_option( 'wc_nuvei_version' ) ) ) {
            $this->install();

            do_action( 'woocommerce_nuvei_updated' );
        }

        $environment_warning = self::get_environment_warning();

        if ( $environment_warning && is_plugin_active( plugin_basename( __FILE__ ) ) ) {
            $this->add_admin_notice( 'bad_environment', 'error', $environment_warning );
        }
    }

    /**
     * Updates the plugin version in db
     *
     * @since 3.1.0
     * @version 3.1.0
     * @return bool
     */
    private static function _update_plugin_version() {
        delete_option( 'wc_nuvei_version' );
        update_option( 'wc_nuvei_version', Nuvei_Gateway_for_WC_VERSION );

        return true;
    }

    /**
     * Dismiss the Google Payment Request API Feature notice.
     *
     * @since 3.1.0
     * @version 3.1.0
     */
    public function dismiss_request_api_notice() {
        update_option( 'wc_nuvei_show_request_api_notice', 'no' );
    }

    /**
     * Handles upgrade routines.
     *
     * @since 3.1.0
     * @version 3.1.0
     */
    public function install() {
        if ( ! defined( 'Nuvei_Gateway_for_WC_INSTALLING' ) ) {
            define( 'Nuvei_Gateway_for_WC_INSTALLING', true );
        }

        $this->_update_plugin_version();
    }

    /**
     * Checks the environment for compatibility problems.  Returns a string with the first incompatibility
     * found or false if the environment has no problems.
     */
    static function get_environment_warning() {
        if ( version_compare( phpversion(), Nuvei_Gateway_for_WC_MIN_PHP_VER, '<' ) ) {
            $message = __( 'WooCommerce Nuvei - The minimum PHP version required for this plugin is %1$s. You are running %2$s.', 'woocommerce-gateway-nuvei' );

            return sprintf( $message, Nuvei_Gateway_for_WC_MIN_PHP_VER, phpversion() );
        }

        if ( ! defined( 'WC_VERSION' ) ) {
            return __( 'WooCommerce Nuvei requires WooCommerce to be activated to work.', 'woocommerce-gateway-nuvei' );
        }

        if ( version_compare( WC_VERSION, Nuvei_Gateway_for_WC_MIN_WC_VER, '<' ) ) {
            $message = __( 'WooCommerce Nuvei - The minimum WooCommerce version required for this plugin is %1$s. You are running %2$s.', 'woocommerce-gateway-nuvei' );

            return sprintf( $message, Nuvei_Gateway_for_WC_MIN_WC_VER, WC_VERSION );
        }

        if ( ! function_exists( 'curl_init' ) ) {
            return __( 'WooCommerce Nuvei - cURL is not installed.', 'woocommerce-gateway-nuvei' );
        }

        return false;
    }

    /**
     * Adds plugin action links
     *
     * @since 1.0.0
     */
    public function plugin_action_links( $links ) {
        $setting_link = $this->get_setting_link();

        $plugin_links = array(
            '<a href="' . $setting_link . '">' . __( 'Settings', 'woocommerce-gateway-nuvei' ) . '</a>',
            '<a href="mailto:support@nuvei.com">' . __( 'Support', 'woocommerce-gateway-nuvei' ) . '</a>',
        );
        return array_merge( $plugin_links, $links );
    }

    /**
     * Get setting link.
     *
     * @since 1.0.0
     *
     * @return string Setting link
     */
    public function get_setting_link() {
        $use_id_as_section = function_exists( 'WC' ) ? version_compare( WC()->version, '2.6', '>=' ) : false;

        $section_slug = $use_id_as_section ? 'nuvei' : strtolower( 'Nuvei_Gateway' );

        return admin_url( 'admin.php?page=wc-settings&tab=checkout&section=' . $section_slug );
    }

    /**
     * Display any notices we've collected thus far (e.g. for connection, disconnection)
     */
    public function admin_notices() {
        $show_request_api_notice = get_option( 'wc_nuvei_show_request_api_notice' );

        if ( empty( $show_request_api_notice ) && false ) {
            // @TODO remove this notice in the future.
            ?>
            <div class="notice notice-warning wc-nuvei-request-api-notice is-dismissible"><p><?php esc_html_e( 'New Feature! Nuvei now supports Google Payment Request. Your customers can now use mobile phones with supported browsers such as Chrome to make purchases easier and faster.', 'woocommerce-gateway-nuvei' ); ?></p></div>

            <script type="application/javascript">
                jQuery( '.wc-nuvei-request-api-notice' ).on( 'click', '.notice-dismiss', function() {
                    var data = {
                        action: 'nuvei_dismiss_request_api_notice'
                    };

                    jQuery.post( '<?php echo admin_url( 'admin-ajax.php' ); ?>', data );
                });
            </script>

            <?php
        }

        foreach ( (array) $this->notices as $notice_key => $notice ) {
            echo "<div class='" . esc_attr( $notice['class'] ) . "'><p>";
            echo wp_kses( $notice['message'], array( 'a' => array( 'href' => array() ) ) );
            echo '</p></div>';
        }
    }

    /**
     * Initialize the gateway. Called very early - in the context of the plugins_loaded action
     *
     * @since 1.0.0
     */
    public function init_gateways() {
        if ( class_exists( 'WC_Subscriptions_Order' ) && function_exists( 'wcs_create_renewal_order' ) ) {
            $this->subscription_support_enabled = true;
        }

        if ( class_exists( 'WC_Pre_Orders_Order' ) ) {
            $this->pre_order_enabled = true;
        }

        if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
            return;
        }

        if ( class_exists( 'WC_Payment_Gateway_CC' ) ) {
            include_once( dirname( __FILE__ ) . '/includes/class-nuvei-gateway.php' );
            include_once( dirname( __FILE__ ) . '/includes/class-wc-nuvei-payment-token-cc.php' );
            include_once( dirname( __FILE__ ) . '/includes/class-wc-nuvei-payment-tokens.php' );
        }

        load_plugin_textdomain( 'woocommerce-gateway-nuvei', false, plugin_basename( dirname( __FILE__ ) ) . '/languages' );
        add_filter( 'woocommerce_payment_gateways', array( $this, 'add_gateways' ) );

    }

    /**
     * Add the gateways to WooCommerce
     *
     * @since 1.0.0
     */
    public function add_gateways( $methods ) {
        $methods[] = 'Nuvei_Gateway';

        return $methods;
    }

    /**
     * List of currencies supported by Nuvei that has no decimals.
     *
     * @return array $currencies
     */
    public static function no_decimal_currencies() {
        return array(
            'bif', // Burundian Franc
            'djf', // Djiboutian Franc
            'jpy', // Japanese Yen
            'krw', // South Korean Won
            'pyg', // Paraguayan Guaraní
            'vnd', // Vietnamese Đồng
            'xaf', // Central African Cfa Franc
            'xpf', // Cfp Franc
            'clp', // Chilean Peso
            'gnf', // Guinean Franc
            'kmf', // Comorian Franc
            'mga', // Malagasy Ariary
            'rwf', // Rwandan Franc
            'vuv', // Vanuatu Vatu
            'xof', // West African Cfa Franc
        );
    }

    /**
     * Nuvei uses smallest denomination in currencies such as cents.
     * We need to format the returned currency from Nuvei into human readable form.
     *
     * @param object $balance_transaction
     * @param string $type Type of number to format
     */
    public static function format_number( $balance_transaction, $type = 'fee' ) {
        if ( ! is_object( $balance_transaction ) ) {
            return;
        }

        if ( in_array( strtolower( $balance_transaction->currency ), self::no_decimal_currencies() ) ) {
            if ( 'fee' === $type ) {
                return $balance_transaction->fee;
            }

            return $balance_transaction->net;
        }

        if ( 'fee' === $type ) {
            return number_format( $balance_transaction->fee / 100, 2, '.', '' );
        }

        return number_format( $balance_transaction->net / 100, 2, '.', '' );
    }

    public static function log( $message ) {
        if ( empty( self::$log ) ) {
            self::$log = new WC_Logger();
        }

        self::$log->add( 'woocommerce-gateway-nuvei', $message );
    }
}

function extend_wcs_get_subscription_period_strings( $translated_periods ) {

    $translated_periods['weekly'] = sprintf( _nx( 'week',  '%s weekly',  1, 'Subscription billing period.', 'woocommerce-subscriptions' ), 1 );
    $translated_periods['fortnightly'] = sprintf( _nx( 'fortnight',  '%s fortnightly',  1, 'Subscription billing period.', 'woocommerce-subscriptions' ), 1 );
    $translated_periods['monthly'] = sprintf( _nx( 'month',  '%s monthly',  1, 'Subscription billing period.', 'woocommerce-subscriptions' ), 1 );
    $translated_periods['quarterly'] = sprintf( _nx( 'quarter',  '%s quarterly',  1, 'Subscription billing period.', 'woocommerce-subscriptions' ), 1 );
    $translated_periods['yearly'] = sprintf( _nx( 'year',  '%s yearly',  1, 'Subscription billing period.', 'woocommerce-subscriptions' ), 1 );

    return $translated_periods;
}
add_filter( 'woocommerce_subscription_periods', 'extend_wcs_get_subscription_period_strings' );

function extend_wcs_get_subscription_ranges( $subscription_ranges ) {

    $subscription_ranges['weekly'] = _x( '1 week', 'Subscription lengths. e.g. "For 1 week..."', 'woocommerce-subscriptions' );
    $subscription_ranges['fortnightly'] = _x( '1 fortnight', 'Subscription lengths. e.g. "For 1 fortnight..."', 'woocommerce-subscriptions' );
    $subscription_ranges['monthly'] = _x( '1 month', 'Subscription lengths. e.g. "For 1 month..."', 'woocommerce-subscriptions' );
    $subscription_ranges['quarterly'] = _x( '1 quarter', 'Subscription lengths. e.g. "For 1 quarter..."', 'woocommerce-subscriptions' );
    $subscription_ranges['yearly'] = _x( '1 year', 'Subscription lengths. e.g. "For 1 year..."', 'woocommerce-subscriptions' );

    return $subscription_ranges;
}
add_filter( 'woocommerce_subscription_lengths', 'extend_wcs_get_subscription_ranges' );

$GLOBALS['wc_nuvei'] = Nuvei_Gateway_for_WC::get_instance();
