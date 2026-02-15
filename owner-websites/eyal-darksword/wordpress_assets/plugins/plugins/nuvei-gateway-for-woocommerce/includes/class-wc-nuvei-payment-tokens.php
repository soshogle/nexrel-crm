<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WC_Nuvei_Payment_Tokens {
	private static $_this;

	/**
	 * Constructor.
	 *
	 * @since 4.0.0
	 * @version 4.0.0
	 */
	public function __construct() {
		self::$_this = $this;

        add_action( 'wp', array( $this, 'delete_payment_method_action' ), 19);
    }

    public static function get_instance() {
        return self::$_this;
    }

    /**
     * Process the delete payment method form.
     */
    public function delete_payment_method_action() {
        global $wp;

        if ( isset( $wp->query_vars['delete-payment-method'] ) ) {
            $this->initSettings();
            wc_nocache_headers();

            $token_id = absint( $wp->query_vars['delete-payment-method'] );
            $token    = WC_Payment_Tokens::get( $token_id );

            $terminalId = $token->get_meta("terminal_id");

            if($terminalId === $this->publishable_key && $this->secret_key) {
                $terminalId = $this->publishable_key;
                $secret = $this->secret_key;
            } else if($terminalId === $this->publishable_key2 && $this->secret_key2) {
                $terminalId = $this->publishable_key2;
                $secret = $this->secret_key2;
            } else if($terminalId === $this->publishable_key3 && $this->secret_key3) {
                $terminalId = $this->publishable_key3;
                $secret = $this->secret_key3;
            }

            $merchantRef = $token->get_meta("merchant_ref");
            $secureCardCardRef = $token->get_token();

            $XmlSecureCardDelRequest = new NuveiXmlSecureCardDelRequest($merchantRef, $terminalId, $secureCardCardRef);

            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
            $response = $XmlSecureCardDelRequest->ProcessRequestToGateway($secret, $serverUrl);

            if ($response->IsError()) {
                wc_add_notice( __( $response->ErrorString(), 'woocommerce' ), 'error' );
            } else {
                if ( is_null( $token ) || get_current_user_id() !== $token->get_user_id() || ! isset( $_REQUEST['_wpnonce'] ) || false === wp_verify_nonce( wp_unslash( $_REQUEST['_wpnonce'] ), 'delete-payment-method-' . $token_id ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
                    wc_add_notice( __( 'Invalid payment method.', 'woocommerce' ), 'error' );
                } else {
                    WC_Payment_Tokens::delete( $token_id );
                    wc_add_notice( __( 'Payment method deleted.', 'woocommerce' ) );
                }
            }

            wp_safe_redirect( wc_get_account_endpoint_url( 'payment-methods' ) );
            exit();
        }

    }

    public function initSettings() {
        // Get setting values.
        $this->title                   = $this->get_option( 'title' );
        $this->description             = $this->get_option( 'description' );
        $this->enabled                 = $this->get_option( 'enabled' );
        $this->testmode                = 'yes' === $this->get_option( 'testmode' );
        $this->avs                = 'yes' === $this->get_option( 'avs' );
        $this->enabled3ds                = 'yes' === $this->get_option( '3ds' );
        $this->capture                 = 'yes' === $this->get_option( 'capture', 'yes' );
        $this->statement_descriptor    = $this->get_option( 'statement_descriptor', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );
        $this->nuvei_checkout         = 'yes' === $this->get_option( 'nuvei_checkout' );
        $this->nuvei_integration_type = $this->get_option( 'nuvei_integration_type' );
        $this->nuvei_checkout_locale  = $this->get_option( 'nuvei_checkout_locale' );
        $this->nuvei_checkout_image   = $this->get_option( 'nuvei_checkout_image', '' );
        $this->saved_cards             = 'yes' === $this->get_option( 'saved_cards' );
        $this->secret_key              = $this->testmode ? $this->get_option( 'test_secret_key' ) : $this->get_option( 'live_secret_key' );
        $this->publishable_key         = $this->testmode ? $this->get_option( 'test_publishable_key' ) : $this->get_option( 'live_publishable_key' );
        $this->currency         = $this->testmode ? $this->get_option( 'test_currency' ) : $this->get_option( 'live_currency' );
        $this->multicurrency         = $this->testmode ? $this->get_option( 'test_multicurrency' ) : $this->get_option( 'live_multicurrency' );
        $this->secret_key2              = $this->testmode ? $this->get_option( 'test_secret_key2' ) : $this->get_option( 'live_secret_key2' );
        $this->publishable_key2         = $this->testmode ? $this->get_option( 'test_publishable_key2' ) : $this->get_option( 'live_publishable_key2' );
        $this->currency2         = $this->testmode ? $this->get_option( 'test_currency2' ) : $this->get_option( 'live_currency2' );
        $this->multicurrency2         = $this->testmode ? $this->get_option( 'test_multicurrency2' ) : $this->get_option( 'live_multicurrency2' );
        $this->secret_key3              = $this->testmode ? $this->get_option( 'test_secret_key3' ) : $this->get_option( 'live_secret_key3' );
        $this->publishable_key3         = $this->testmode ? $this->get_option( 'test_publishable_key3' ) : $this->get_option( 'live_publishable_key3' );
        $this->currency3         = $this->testmode ? $this->get_option( 'test_currency3' ) : $this->get_option( 'live_currency3' );
        $this->multicurrency3         = $this->testmode ? $this->get_option( 'test_multicurrency3' ) : $this->get_option( 'live_multicurrency3' );
        $this->logging                 = 'yes' === $this->get_option( 'logging' );
        $this->terminal_settings = [];
    }

    public static function get_option($key) {
        $options = get_option("woocommerce_nuvei_settings");

        return isset($options[$key])?$options[$key]:'';
    }
}

new WC_Nuvei_Payment_Tokens();
