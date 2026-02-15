<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once( dirname( __FILE__ ) . '/nuvei_gateway_xml_api.php' );

/**
 * Nuvei_Gateway class.
 *
 * @extends WC_Payment_Gateway
 */
class Nuvei_Gateway extends WC_Payment_Gateway_CC {

	/**
	 * Should we capture Credit cards
	 *
	 * @var bool
	 */
	public $capture;

	/**
	 * Alternate credit card statement name
	 *
	 * @var bool
	 */
	public $statement_descriptor;

	/**
	 * Checkout enabled
	 *
	 * @var bool
	 */
	public $nuvei_checkout;

	/**
	 * Checkout Locale
	 *
	 * @var string
	 */
	public $nuvei_checkout_locale;

	/**
	 * Credit card image
	 *
	 * @var string
	 */
	public $nuvei_checkout_image;

	/**
	 * Should we store the users credit cards?
	 *
	 * @var bool
	 */
	public $saved_cards;

	/**
	 * API access secret key
	 *
	 * @var string
	 */
	public $secret_key;

	/**
	 * Api access publishable key
	 *
	 * @var string
	 */
	public $publishable_key;

	/**
	 * Is test mode active?
	 *
	 * @var bool
	 */
	public $testmode;

	/**
	 * Logging enabled?
	 *
	 * @var bool
	 */
	public $logging;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->id                   = 'nuvei';
		$this->method_title         = __( 'Nuvei', 'woocommerce-gateway-nuvei' );
		$this->method_description   = sprintf( __( 'Nuvei works by adding credit card fields on the checkout and then sending the details to gateway for verification.', 'woocommerce-gateway-nuvei' ));
		$this->has_fields           = true;
		$this->supports             = array(
			'products',
			'refunds',
			'pre-orders',
		);

		//TODO: refactor to use correct hooks in a later release
        global $post;
        $order_id = @$post->ID;
        if($order_id) {
            $order = wc_get_order( $order_id );
            if ($order) {
                $orderStatus = $order->get_status();

                if (!$order->get_transaction_id() || $orderStatus === 'refunded') {
                    unset($this->supports[1]);
                }
            }
        } else {
            if(!isset($_POST['api_refund'])) unset($this->supports[1]);
        }

        if( $this->get_option( 'securecard' ) === 'yes' ) {
            $securecard_supports = ['tokenization',
                'add_payment_method',
                'subscriptions',
                'subscription_cancellation',
                //'subscription_reactivation',
                //'subscription_suspension',
                //'subscription_amount_changes',
                //'subscription_payment_method_change', // Subs 1.n compatibility.
                //'subscription_payment_method_change_customer',
                //'subscription_payment_method_change_admin',
                //'subscription_date_changes',
                //'multiple_subscriptions'
            ];

            $this->supports = array_merge($this->supports, $securecard_supports);
        }

		// Load the form fields.
		$this->init_form_fields();

		// Load the settings.
		$this->init_settings();

		// Get setting values.
		$this->title                   = $this->get_option( 'title' );
		$this->description             = $this->get_option( 'description' );
		$this->enabled                 = $this->get_option( 'enabled' );
        $this->testmode                = 'yes' === $this->get_option( 'testmode' );
        $this->avs                = 'yes' === $this->get_option( 'avs' );
        $this->enabled3ds                = 'yes' === $this->get_option( '3ds' );
        $this->securecard                = 'yes' === $this->get_option( 'securecard' );
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
        $this->applepay_active         = 'yes' === $this->get_option( 'applepay_active' );

		if ( $this->nuvei_integration_type=='hpp') {
			$this->order_button_text = __( 'Continue to payment', 'woocommerce-gateway-nuvei' );
		}

		if ( $this->testmode ) {
			$this->description .= ' ' . sprintf( __( ' - TEST MODE ENABLED') );
			$this->description  = trim( $this->description );
		}

		// Hooks.
		add_action( 'wp_enqueue_scripts', array( $this, 'payment_scripts' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts' ) );
		add_action( 'admin_notices', array( $this, 'admin_notices' ) );
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_before_checkout_form', array( $this, 'display_errors' ) );

        add_filter( 'wcs_view_subscription_actions',  array( $this, 'cancel_subscription_action' ), 10, 2 );
        add_action( 'woocommerce_review_order_after_submit',  array( $this, 'applepay_button' ), 5 );
        add_action( 'woocommerce_pay_order_after_submit',  array( $this, 'applepay_button' ), 5 );
	}

    function applepay_button() {
        if($this->nuvei_integration_type == 'xml' && $this->applepay_active && isset($this->terminal_settings["FEATURES"]) && $this->terminal_settings["FEATURES"]["SUPPORTS_APPLE_PAY"] === "true") {
            $orderHasSubscription = false;

            foreach ( WC()->cart->get_cart() as $item ) {
                if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                    $orderHasSubscription = true;
                }
            }

            if(!$orderHasSubscription) {
                echo '<div id="nuvei-apple-pay-button" class="apple-pay-button apple-pay-button-black" style="display: none; -webkit-appearance: -apple-pay-button; -apple-pay-button-type: buy; -apple-pay-button-style: black;"></div>
                
                    <script type="text/javascript">
                        if(window.ApplePaySession && ApplePaySession.canMakePayments() && (jQuery( "input#payment_method_nuvei", this.form).is(\':checked\') || jQuery( "input#payment_method_nuvei", this.form).length === 0)) {
                            jQuery("#nuvei-apple-pay-button", this.form).css("display", "inline-block");
                        }
                            
                        jQuery( "input[name=\'payment_method\']", this.form).change(function() {
                                    if( this.value !== "nuvei") {
                                        jQuery("#nuvei-apple-pay-button", this.form).css("display", "none");
                                    } else {
                                        jQuery("#nuvei-apple-pay-button", this.form).css("display", "inline-block");
                                    }
                                }
                            );
                    </script>
                    ';
            }
        }
    }

    public function display_errors() {
        if(isset($_GET['ERRORSTRING']) && (!isset($_GET['RESULT']) || sanitize_text_field($_GET['RESULT']) !== 'E'))
            wc_add_notice( sanitize_text_field($_GET['ERRORSTRING']), 'error' );
    }

    public function cancel_subscription_action ( $actions, $subscription ) {
        if ( $subscription->has_status( array( 'active' ) ) ) {
            $current_status = $subscription->get_status();
            $subscription_id = $subscription->get_order_number();
            $subscription_url = $subscription->get_view_order_url();
            $cancel_url = add_query_arg( array(
                'subscription_id' => $subscription_id,
                'change_subscription_to' => 'cancelled',
            ), $subscription_url );
            $cancel_subscription_url = wp_nonce_url( $cancel_url, $subscription_id . $current_status );

            $actions['cancel'] = array(
                'url' => $cancel_subscription_url,
                'name' => __( 'Cancel', 'woocommerce-subscriptions' ),
            );
        } else {
            unset($actions['resubscribe']);
        }

        return $actions;
    }

    /**
     * Outputs fields for entering credit card information.
     * @since 2.6.0
     */
    public function form() {
        session_start();
        if (version_compare(PHP_VERSION, '5.3.0') >= 0) {
            if (empty($_SESSION['CSRF-Token'])) {
                $_SESSION['CSRF-Token'] = bin2hex(random_bytes(32));
            }
        } elseif (version_compare(PHP_VERSION, '5.3.0') >= 0) {
            if (empty($_SESSION['CSRF-Token'])) {
                if (function_exists('mcrypt_create_iv')) {
                    $_SESSION['CSRF-Token'] = bin2hex(mcrypt_create_iv(32, MCRYPT_DEV_URANDOM));
                } else {
                    $_SESSION['CSRF-Token'] = bin2hex(openssl_random_pseudo_bytes(32));
                }
            }
        }

        $terminalSettings = $this->terminal_settings;

        $cardholder = '';

        $applepayTotalAmount = (float) WC()->cart->total;

        if(isset($_GET['key'])) {
            $order_id = wc_get_order_id_by_order_key( urldecode( $_GET['key'] ) );
            $order    = wc_get_order( $order_id );

            $firstName = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_first_name : $order->get_billing_first_name();
            $lastName = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_last_name : $order->get_billing_last_name();
            $cardholder = $firstName . ' ' . $lastName;

            $applepayTotalAmount = (float) $order->get_total();
        }


        if(isset($_SESSION['request3ds'])) {
            $request3ds = $_SESSION['request3ds'];

            $checkSum = md5($request3ds['TERMINALID'] . ':' . $request3ds['CARDHOLDERNAME'] . ':' .
                $request3ds['CARDNUMBER'] . ':' . $request3ds['CARDEXPIRY'] . ':' . $request3ds['CARDTYPE'] . ':' .
                $request3ds['AMOUNT'] . ':' . $request3ds['CURRENCY'] . ':' . $request3ds['ORDERID'] . ':' .
                $request3ds['CVV'] . ':' . $request3ds['DATETIME'] . ':' . $request3ds['HASH'] . ':' . $request3ds['redirectUrl'] );

            if(hash_equals($checkSum, $request3ds['checkSum'])) {

                echo '<script type="text/javascript">
                    var form = document.createElement("form");
                    form.style.display = "none";
                    
                    var TERMINALID = document.createElement("input"); 
                    TERMINALID.value="'. $request3ds['TERMINALID'] .'";
                    TERMINALID.name="TERMINALID";
                    form.appendChild(TERMINALID);  
                    
                    var CARDHOLDERNAME = document.createElement("input"); 
                    CARDHOLDERNAME.value="'. $request3ds['CARDHOLDERNAME'] .'";
                    CARDHOLDERNAME.name="CARDHOLDERNAME";
                    form.appendChild(CARDHOLDERNAME);  
                    
                    var CARDNUMBER = document.createElement("input"); 
                    CARDNUMBER.value="'. $request3ds['CARDNUMBER'] .'";
                    CARDNUMBER.name="CARDNUMBER";
                    form.appendChild(CARDNUMBER);  
                    
                    var CARDEXPIRY = document.createElement("input"); 
                    CARDEXPIRY.value="'. $request3ds['CARDEXPIRY'] .'";
                    CARDEXPIRY.name="CARDEXPIRY";
                    form.appendChild(CARDEXPIRY);  
                    
                    var CARDTYPE = document.createElement("input"); 
                    CARDTYPE.value="'. $request3ds['CARDTYPE'] .'";
                    CARDTYPE.name="CARDTYPE";
                    form.appendChild(CARDTYPE);  
                    
                    var AMOUNT = document.createElement("input"); 
                    AMOUNT.value="'. $request3ds['AMOUNT'] .'";
                    AMOUNT.name="AMOUNT";
                    form.appendChild(AMOUNT);  
                    
                    var CURRENCY = document.createElement("input"); 
                    CURRENCY.value="'. $request3ds['CURRENCY'] .'";
                    CURRENCY.name="CURRENCY";
                    form.appendChild(CURRENCY);  
                    
                    var ORDERID = document.createElement("input"); 
                    ORDERID.value="'. $request3ds['ORDERID'] .'";
                    ORDERID.name="ORDERID";
                    form.appendChild(ORDERID);  
                    
                    var CVV = document.createElement("input"); 
                    CVV.value="'. $request3ds['CVV'] .'";
                    CVV.name="CVV";
                    form.appendChild(CVV);  
                    
                    var DATETIME = document.createElement("input"); 
                    DATETIME.value="'. $request3ds['DATETIME'] .'";
                    DATETIME.name="DATETIME";
                    form.appendChild(DATETIME);  
                    
                    var HASH = document.createElement("input"); 
                    HASH.value="'. $request3ds['HASH'] .'";
                    HASH.name="HASH";
                    form.appendChild(HASH);  
                    
                    var APP_VERSION = document.createElement("input"); 
                    APP_VERSION.value="7.10.0.0";
                    APP_VERSION.name="APP_VERSION";
                    form.appendChild(APP_VERSION);  
                                    
                    form.method = "POST";
                    form.action = "'. $request3ds['redirectUrl'] .'";  
                
                    document.body.appendChild(form);
                
                    form.submit();
                  </script>';

            }

            $_SESSION['request3ds'] = '';
            unset($_SESSION['request3ds']);

            return;
        }

        wp_enqueue_script( 'wc-credit-card-form' );

        $fields = array();

        $cvc_field = '<p class="form-row form-row-last">
			<label for="' . esc_attr( $this->id ) . '-card-cvc">' . esc_html__( 'Card code', 'woocommerce' ) . ' <span class="required">*</span></label>
			<input id="' . esc_attr( $this->id ) . '-card-cvc" class="input-text wc-credit-card-form-card-cvc" inputmode="numeric" autocomplete="off" autocorrect="no" autocapitalize="no" spellcheck="no" type="tel" maxlength="4" placeholder="' . esc_attr__( 'CVC', 'woocommerce' ) . '" ' . $this->field_name( 'card-cvc' ) . ' style="width:100px" />
		</p>';

        $default_fields = array(
            'card-name-field' => '<p class="form-row form-row-wide">
				<label for="' . esc_attr( $this->id ) . '-card-name">' . esc_html__( 'Card holder', 'woocommerce' ) . ' <span class="required">*</span></label>
				<input id="' . esc_attr( $this->id ) . '-card-name" class="input-text wc-credit-card-form-card-name" inputmode="text" autocomplete="cc-name" autocorrect="no" autocapitalize="no" spellcheck="no" type="text" placeholder="" ' . $this->field_name( 'card-name' ) . ' value="'.$cardholder.'" />
			</p>',
            'card-number-field' => '<p class="form-row form-row-wide">
				<label for="' . esc_attr( $this->id ) . '-card-number">' . esc_html__( 'Card number', 'woocommerce' ) . ' <span class="required">*</span></label>
				<input id="' . esc_attr( $this->id ) . '-card-number" class="input-text wc-credit-card-form-card-number" inputmode="numeric" autocomplete="cc-number" autocorrect="no" autocapitalize="no" spellcheck="no" type="tel" placeholder="&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;" ' . $this->field_name( 'card-number' ) . ' />
			</p>',
            'card-expiry-field' => '<p class="form-row form-row-first">
				<label for="' . esc_attr( $this->id ) . '-card-expiry">' . esc_html__( 'Expiry (MM/YY)', 'woocommerce' ) . ' <span class="required">*</span></label>
				<input id="' . esc_attr( $this->id ) . '-card-expiry" class="input-text wc-credit-card-form-card-expiry" inputmode="numeric" autocomplete="cc-exp" autocorrect="no" autocapitalize="no" spellcheck="no" type="tel" placeholder="' . esc_attr__( 'MM / YY', 'woocommerce' ) . '" ' . $this->field_name( 'card-expiry' ) . ' />
			</p>',
            'csrf-token' => '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-csrf-token" class="input-text wc-credit-card-form-card-expiry" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" value="' . $_SESSION['CSRF-Token'] . '" />
			</p>',
        );

        if ( ! $this->supports( 'credit_card_form_cvc_on_saved_method' ) ) {
            $default_fields['card-cvc-field'] = $cvc_field;
        }

        if($this->applepay_active && isset($terminalSettings['FEATURES']) && isset($terminalSettings['FEATURES']['SUPPORTS_APPLE_PAY']) && $terminalSettings['FEATURES']['SUPPORTS_APPLE_PAY'] === "true") {
            $supportedNetworks = array();
            if(isset($terminalSettings['SUPPORTED_CARDTYPES']['CARDTYPE']))
                foreach ($terminalSettings['SUPPORTED_CARDTYPES']['CARDTYPE'] as $cardType) {
                    $mappedCardType = $this->mapCardType($cardType);
                    if($mappedCardType && !in_array($mappedCardType, $supportedNetworks))
                        array_push($supportedNetworks, $mappedCardType);
                }

            $default_fields['card-type'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-card-type" class="input-text wc-credit-card-type" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepayload'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepayload" class="input-text wc-applepayload" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepay-countryCode'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepay-countryCode" class="input-text wc-applepay-countryCode" value="' . WC()->countries->get_base_country() . '" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepay-currencyCode'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepay-currencyCode" class="input-text wc-applepay-currencyCode" value="' . get_option('woocommerce_currency') . '" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepay-totalAmount'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepay-totalAmount" class="input-text wc-applepay-totalAmount" value="' . $applepayTotalAmount . '" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepay-supportedNetworks'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepay-supportedNetworks" class="input-text wc-applepay-supportedNetworks" value="' . implode(",", $supportedNetworks) . '" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
            $default_fields['applepay-controller'] = '<p class="form-row form-row-first" style="display: none;">
				<input id="' . esc_attr( $this->id ) . '-applepay-controller" class="input-text wc-applepay-controller" value="' . get_site_url(null, '?rest_route=/nuvei-gateway-for-woocommerce/v1/applepaysession', 'https') . '" inputmode="hidden" autocorrect="no" autocapitalize="no" spellcheck="no" />
			</p>';
        }

        $fields = wp_parse_args( $fields, apply_filters( 'woocommerce_credit_card_form_fields', $default_fields, $this->id ) );
        ?>

        <fieldset id="wc-<?php echo esc_attr( $this->id ); ?>-cc-form" class='wc-credit-card-form wc-payment-form'>
            <?php do_action( 'woocommerce_credit_card_form_start', $this->id ); ?>
            <?php
            foreach ( $fields as $field ) {
                echo $field;
            }
            ?>
            <?php do_action( 'woocommerce_credit_card_form_end', $this->id ); ?>
            <div class="clear"></div>
        </fieldset>
        <?php

        if ( $this->supports( 'credit_card_form_cvc_on_saved_method' ) ) {
            echo '<fieldset>' . $cvc_field . '</fieldset>';
        }
    }

    /**
     * Get_icon function.
     *
     * @access public
     * @return string
     */
    public function get_icon() {
        $this->get_terminal_settings();

        $style = version_compare( WC()->version, '2.6', '>=' ) ? 'style="margin-left: 0.3em"' : '';

        $icon = '';

        if(isset($this->terminal_settings['SUPPORTED_CARDTYPES'])) {
            if(is_array($this->terminal_settings['SUPPORTED_CARDTYPES']['CARDTYPE']))
                $cards = $this->terminal_settings['SUPPORTED_CARDTYPES']['CARDTYPE'];
            else
                $cards = [ $this->terminal_settings['SUPPORTED_CARDTYPES']['CARDTYPE'] ];

            if(in_array('Visa Credit', $cards) || in_array('Visa Debit', $cards) || in_array('Visa Electron', $cards) || in_array('Delta', $cards))
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/visa.svg" alt="Visa" width="32" ' . $style . ' />';

            if(in_array('MasterCard', $cards) || in_array('Debit MasterCard', $cards) || in_array('Maestro', $cards))
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/mastercard.svg" alt="Mastercard" width="32" ' . $style . ' />';

            if(in_array('American Express', $cards))
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/amex.svg" alt="Amex" width="32" ' . $style . ' />';

            if(in_array('Diners', $cards) || in_array('Discover', $cards))
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/diners.svg" alt="Diners" width="32" ' . $style . ' />';

            if(in_array('JCB', $cards))
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/jcb.svg" alt="JCB" width="32" ' . $style . ' />';

            if($icon === '')
                $icon .= '<img src="' . WC_Nuvei_PLUGIN_URL . '/assets/images/icons/credit-cards/generic.svg" alt="Debit or Credit Card" width="32" ' . $style . ' />';

        }


        return apply_filters( 'woocommerce_gateway_icon', $icon, $this->id );
    }

	/**
	 * Get Nuvei amount to pay
	 *
	 * @param float  $total Amount due.
	 * @param string $currency Accepted currency.
	 *
	 * @return float|int
	 */
	public function get_nuvei_amount( $total, $currency = '' ) {
		if ( ! $currency ) {
			$currency = get_woocommerce_currency();
		}
		switch ( strtoupper( $currency ) ) {
			// Zero decimal currencies.
			case 'BIF' :
			case 'CLP' :
			case 'DJF' :
			case 'GNF' :
			case 'JPY' :
			case 'KMF' :
			case 'KRW' :
			case 'MGA' :
			case 'PYG' :
			case 'RWF' :
			case 'VND' :
			case 'VUV' :
			case 'XAF' :
			case 'XOF' :
			case 'XPF' :
				$total = absint( $total );
				break;
			default :
				$total = round( $total, 2 ) * 100; // In cents.
				break;
		}
		return $total;
	}

	/**
	 * Check if SSL is enabled and notify the user
	 */
	public function admin_notices() {
		if ( 'no' === $this->enabled ) {
			return;
		}

		// Show message if enabled and FORCE SSL is disabled and WordpressHTTPS plugin is not detected.
		if ( ( function_exists( 'wc_site_is_https' ) && ! wc_site_is_https() ) && ( 'no' === get_option( 'woocommerce_force_ssl_checkout' ) && ! class_exists( 'WordPressHTTPS' ) ) ) {
			echo '<div class="error nuvei-ssl-message"><p>' . sprintf( __( 'Nuvei is enabled, but the <a href="%1$s">force SSL option</a> is disabled; your checkout may not be secure! Please enable SSL and ensure your server has a valid <a href="%2$s" target="_blank">SSL certificate</a> - Nuvei will only work in test mode.', 'woocommerce-gateway-nuvei' ), admin_url( 'admin.php?page=wc-settings&tab=checkout' ), 'https://en.wikipedia.org/wiki/Transport_Layer_Security' ) . '</p></div>';
		}
	}

	/**
	 * Check if this gateway is enabled
	 */
	public function is_available() {
		if ( 'yes' === $this->enabled ) {
			if ( ! $this->testmode && is_checkout() && ! is_ssl() ) {
				return false;
			}
			if ( (! $this->secret_key || ! $this->publishable_key ) && (! $this->secret_key2 || ! $this->publishable_key2 ) && (! $this->secret_key3 || ! $this->publishable_key3 ))  {
				return false;
			}
			return true;
		}
		return false;
	}

	/**
     * Initialise Gateway Settings Form Fields
     */
	public function init_form_fields() {
        $this->form_fields = apply_filters( 'wc_nuvei_settings',
            array(
                'enabled' => array(
                    'title'       => __( 'Enable/Disable', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable Nuvei', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => '',
                    'default'     => 'no',
                ),
                'title' => array(
                    'title'       => __( 'Title', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'This controls the title which the user sees during checkout.', 'woocommerce-gateway-nuvei' ),
                    'default'     => __( 'Debit or Credit Card (Nuvei)', 'woocommerce-gateway-nuvei' ),
                    'desc_tip'    => true,
                    'custom_attributes' => array('readonly' => 'readonly')
                ),
                'description' => array(
                    'title'       => __( 'Description', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'This controls the description which the user sees during checkout.', 'woocommerce-gateway-nuvei' ),
                    'default'     => __( 'Pay with your debit or credit card via Nuvei.', 'woocommerce-gateway-nuvei' ),
                    'desc_tip'    => true,
                    'custom_attributes' => array('readonly' => 'readonly')
                ),
                'unbranded' => array(
                    'title'       => __( 'Unbranded checkout', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Hide Nuvei mention from checkout page', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'testmode' => array(
                    'title'       => __( 'Test mode', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable Test Mode', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Place the payment gateway in test mode using test API keys.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'yes',
                    'desc_tip'    => true,
                ),
                'avs' => array(
                    'title'       => __( 'AVS', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable AVS', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Make sure AVS is enabled on your terminal.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'default_ip' => array(
                    'title'       => __( 'Default IP', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Leave blank unless otherwise instructed.', 'woocommerce-gateway-nuvei' ),
                    'desc_tip'    => true,
                ),
                '3ds' => array(
                    'title'       => __( '3DS', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable 3DS', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Make sure 3DS is enabled on your terminal.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'mpi_receipt_url' => array(
                    'title'       => __( 'MPI Receipt URL', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( '', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Set this value in your Selfcare Settings > Terminal', 'woocommerce-gateway-nuvei' ),
                    'default'     => get_permalink( wc_get_page_id( 'checkout' ) ),
                    'desc_tip'    => true,
                    'custom_attributes' => array('readonly' => 'readonly')
                ),

                'securecard' => array(
                    'title'       => __( 'Secure Card', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable payment methods storage', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Make sure Secure Card storage is enabled on your terminal.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'securecard_url' => array(
                    'title'       => __( 'Secure Card URL', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( '', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Set this value in your Selfcare Settings > Terminal', 'woocommerce-gateway-nuvei' ),
                    'default'     => get_permalink( wc_get_page_id( 'checkout' ) ),
                    'desc_tip'    => true,
                    'custom_attributes' => array('readonly' => 'readonly')
                ),

                'background_validation' => array(
                    'title'       => __( 'Background Validation', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable validation', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Make sure Validation is enabled on your terminal.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'background_validation_url' => array(
                    'title'       => __( 'Validation URL', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( '', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Set this value in your Selfcare Settings > Terminal', 'woocommerce-gateway-nuvei' ),
                    'default'     => wc_get_cart_url(),
                    'desc_tip'    => true,
                    'custom_attributes' => array('readonly' => 'readonly')
                ),

                'test_publishable_key' => array(
                    'title'       => __( 'Test Primary Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_secret_key' => array(
                    'title'       => __( 'Test Primary Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_currency' => array(
                    'title'       => __( 'Test Primary Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'test_multicurrency' => array(
                    'title'       => __( 'Test multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'test_publishable_key2' => array(
                    'title'       => __( 'Test Second Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_secret_key2' => array(
                    'title'       => __( 'Test Second Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_currency2' => array(
                    'title'       => __( 'Test Second Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'test_multicurrency2' => array(
                    'title'       => __( 'Test Second multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'test_publishable_key3' => array(
                    'title'       => __( 'Test Third Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_secret_key3' => array(
                    'title'       => __( 'Test Third Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_currency3' => array(
                    'title'       => __( 'Test Third Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'test_multicurrency3' => array(
                    'title'       => __( 'Test Third multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),

                'live_publishable_key' => array(
                    'title'       => __( 'Live Primary Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_secret_key' => array(
                    'title'       => __( 'Live Primary Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_currency' => array(
                    'title'       => __( 'Live Primary Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'live_multicurrency' => array(
                    'title'       => __( 'Live multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'live_publishable_key2' => array(
                    'title'       => __( 'Live Second Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_secret_key2' => array(
                    'title'       => __( 'Live Second Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_currency2' => array(
                    'title'       => __( 'Live Second Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'live_multicurrency2' => array(
                    'title'       => __( 'Live Second multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),
                'live_publishable_key3' => array(
                    'title'       => __( 'Live Third Terminal Id', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_secret_key3' => array(
                    'title'       => __( 'Live Third Shared Secret', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_currency3' => array(
                    'title'       => __( 'Live Third Currency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'Euro',
                    'desc_tip'    => true,
                    'options'     => array(
                        'EUR' => __( 'Euro', 'woocommerce-gateway-nuvei' ),
                        'GBP'   => __( 'Sterling', 'woocommerce-gateway-nuvei' ),
                        'USD'   => __( 'US Dollar', 'woocommerce-gateway-nuvei' ),
                        'CAD'   => __( 'Canadian Dollar', 'woocommerce-gateway-nuvei' ),
                        'AUD'   => __( 'Australian Dollar', 'woocommerce-gateway-nuvei' ),
                        'DKK'   => __( 'Danish Krone', 'woocommerce-gateway-nuvei' ),
                        'SEK'   => __( 'Swedish Krona', 'woocommerce-gateway-nuvei' ),
                        'NOK'   => __( 'Norwegian Krone', 'woocommerce-gateway-nuvei' ),
                    ),
                ),
                'live_multicurrency3' => array(
                    'title'       => __( 'Live Third multicurrency', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable multicurrency', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),

                'nuvei_integration_type' => array(
                    'title'       => __( 'Integration type', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'select',
                    'class'       => '',
                    'description' => __( '', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'XML',
                    'desc_tip'    => true,
                    'options'     => array(
                        'xml' => __( 'XML', 'woocommerce-gateway-nuvei' ),
                        'hpp'   => __( 'HPP', 'woocommerce-gateway-nuvei' ),
                    ),
                ),

                'applepay_active' => array(
                    'title'       => __( 'ApplePay Enabled', 'woocommerce-gateway-nuvei' ),
                    'label'       => __( 'Enable ApplePay', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'checkbox',
                    'description' => __( 'Make ApplePay payment available on checkout.', 'woocommerce-gateway-nuvei' ),
                    'default'     => 'no',
                    'desc_tip'    => true,
                ),

                'test_applepay_merchant_identifier' => array(
                    'title'       => __( 'Test ApplePay Merchant Identifier', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Merchant ID defined on Apple development portal', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_applepay_display_name' => array(
                    'title'       => __( 'Test ApplePay Display Name', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Store name shown on ApplePay popup', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'test_applepay_initiative_context' => array(
                    'title'       => __( 'Test ApplePay Initiative Context', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Initiative Context defined on Apple development portal (i.e. domain.com)', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),

                'live_applepay_merchant_identifier' => array(
                    'title'       => __( 'Live ApplePay Merchant Identifier', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Merchant ID defined on Apple development portal', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_applepay_display_name' => array(
                    'title'       => __( 'Live ApplePay Display Name', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Store name shown on ApplePay popup', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),
                'live_applepay_initiative_context' => array(
                    'title'       => __( 'Live ApplePay Initiative Context', 'woocommerce-gateway-nuvei' ),
                    'type'        => 'text',
                    'description' => __( 'Initiative Context defined on Apple development portal (i.e. domain.com)', 'woocommerce-gateway-nuvei' ),
                    'default'     => '',
                    'desc_tip'    => true,
                ),

            )
        );
    }

	public function get_terminal_settings() {
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

	/**
	 * Payment form on checkout page
	 */
	public function payment_fields() {
	    $terminalSettings = $this->terminal_settings;

		$user                 = wp_get_current_user();
		$display_tokenization = $this->supports( 'tokenization' ) && is_checkout() ;
		if(!isset($terminalSettings['FEATURES']) || !isset($terminalSettings['FEATURES']['SECURE_CARD_STORAGE']) || !isset($terminalSettings['FEATURES']['SECURE_CARD_STORAGE']['ENABLED']) || $terminalSettings['FEATURES']['SECURE_CARD_STORAGE']['ENABLED'] === "false")
            $display_tokenization = false;

		$total                = WC()->cart->total;

		// If paying from order, we need to get total from order not cart.
		if ( isset( $_GET['pay_for_order'] ) && ! empty( $_GET['key'] ) ) {
			$order = wc_get_order( wc_get_order_id_by_order_key( wc_clean( $_GET['key'] ) ) );
			$total = $order->get_total();
		}

		if ( $user->ID ) {
			$user_email = get_user_meta( $user->ID, 'billing_email', true );
			$user_email = $user_email ? $user_email : $user->user_email;
		} else {
			$user_email = '';
		}

		if ( is_add_payment_method_page() ) {
			$pay_button_text = __( 'Add Card', 'woocommerce-gateway-nuvei' );
			$total        = '';
		} else {
			$pay_button_text = '';
		}


		echo '<div
			id="nuvei-payment-data"
			data-panel-label="' . esc_attr( $pay_button_text ) . '"
			data-description=""
			data-name="' . esc_attr( $this->statement_descriptor ) . '"
			data-image="' . esc_attr( $this->nuvei_checkout_image ) . '"
			data-locale="' . esc_attr( $this->nuvei_checkout_locale ? $this->nuvei_checkout_locale : 'en' ) . '"">';

		if ( $this->description ) {
			echo apply_filters( 'wc_nuvei_description', wpautop( wp_kses_post( $this->description ) ) );
		}

		if ( $display_tokenization ) {
			$this->tokenization_script();
			$this->saved_payment_methods();
		}

		if ( $this->nuvei_integration_type=='xml' || is_add_payment_method_page()) {
			$this->form();

			if ( apply_filters( 'wc_nuvei_display_save_payment_method_checkbox', $display_tokenization ) ) {
				$this->save_payment_method_checkbox();
			}
		}

		echo '</div>';
	}

	/**
	 * Localize Nuvei messages based on code
	 *
	 * @since 3.0.6
	 * @version 3.0.6
	 * @return array
	 */
	public function get_localized_messages() {
		return apply_filters( 'wc_nuvei_localized_messages', array(
			'invalid_number'        => __( 'The card number is not a valid credit card number.', 'woocommerce-gateway-nuvei' ),
			'invalid_expiry_month'  => __( 'The card\'s expiration month is invalid.', 'woocommerce-gateway-nuvei' ),
			'invalid_expiry_year'   => __( 'The card\'s expiration year is invalid.', 'woocommerce-gateway-nuvei' ),
			'invalid_cvc'           => __( 'The card\'s security code is invalid.', 'woocommerce-gateway-nuvei' ),
			'incorrect_number'      => __( 'The card number is incorrect.', 'woocommerce-gateway-nuvei' ),
			'expired_card'          => __( 'The card has expired.', 'woocommerce-gateway-nuvei' ),
			'incorrect_cvc'         => __( 'The card\'s security code is incorrect.', 'woocommerce-gateway-nuvei' ),
			'incorrect_zip'         => __( 'The card\'s zip code failed validation.', 'woocommerce-gateway-nuvei' ),
			'card_declined'         => __( 'The card was declined.', 'woocommerce-gateway-nuvei' ),
			'missing'               => __( 'There is no card on a customer that is being charged.', 'woocommerce-gateway-nuvei' ),
			'processing_error'      => __( 'An error occurred while processing the card.', 'woocommerce-gateway-nuvei' ),
			'invalid_request_error' => __( 'Could not find payment information.', 'woocommerce-gateway-nuvei' ),
		) );
	}

	/**
	 * Load admin scripts.
	 *
	 * @since 3.1.0
	 * @version 3.1.0
	 */
	public function admin_scripts() {
		if ( 'woocommerce_page_wc-settings' !== get_current_screen()->id ) {
			return;
		}


		wp_enqueue_script( 'nuvei_gateway_admin', plugins_url( 'assets/js/nuvei-admin.js', Nuvei_Gateway_for_WC_MAIN_FILE ), array(), Nuvei_Gateway_for_WC_VERSION, true );

		$nuvei_admin_params = array(
			'localized_messages' => array(
				'not_valid_live_key_msg' => __( 'This is not a valid live key. Live keys start with "sk_live_" and "pk_live_".', 'woocommerce-gateway-nuvei' ),
				'not_valid_test_key_msg' => __( 'This is not a valid test key. Test keys start with "sk_test_" and "pk_test_".', 'woocommerce-gateway-nuvei' ),
				're_verify_button_text'  => __( 'Re-verify Domain', 'woocommerce-gateway-nuvei' ),
				'missing_secret_key'     => __( 'Missing Secret Key. Please set the secret key field above and re-try.', 'woocommerce-gateway-nuvei' ),
			),
			'ajaxurl'            => admin_url( 'admin-ajax.php' )
		);

		wp_localize_script( 'nuvei_gateway_admin', 'nuvei_gateway_admin_params', apply_filters( '_nuvei_gateway_admin_params', $nuvei_admin_params ) );
	}

	/**
	 * payment_scripts function.
	 *
	 * Outputs scripts used for nuvei payment
	 *
	 * @access public
	 */
	public function payment_scripts() {
		if ( ! is_cart() && ! is_checkout() && ! isset( $_GET['pay_for_order'] ) && ! is_add_payment_method_page() ) {
			return;
		}

		if ( $this->nuvei_integration_type == 'hpp' && !is_add_payment_method_page() ) {
			wp_enqueue_script( 'woocommerce_nuvei', plugins_url( 'assets/js/nuvei-hpp.js', Nuvei_Gateway_for_WC_MAIN_FILE ), '', Nuvei_Gateway_for_WC_VERSION, true );
		} else {
			wp_enqueue_script( 'ccValidator', plugins_url( 'assets/js/jquery.creditCardValidator.js', Nuvei_Gateway_for_WC_MAIN_FILE ), '', Nuvei_Gateway_for_WC_VERSION, true );
			wp_enqueue_script( 'woocommerce_nuvei', plugins_url( 'assets/js/nuvei-xml.js', Nuvei_Gateway_for_WC_MAIN_FILE ), array( 'jquery-payment', 'ccValidator'), Nuvei_Gateway_for_WC_VERSION, true );
		}

		$nuvei_params = array(
			'key'                  => $this->publishable_key,
			'i18n_terms'           => __( 'Please accept the terms and conditions first', 'woocommerce-gateway-nuvei' ),
			'i18n_required_fields' => __( 'Please fill in required checkout fields first', 'woocommerce-gateway-nuvei' ),
		);

		// If we're on the pay page we need to pass nuvei.js the address of the order.
		if ( isset( $_GET['pay_for_order'] ) && 'true' === wc_clean(wp_unslash($_GET['pay_for_order'])) ) {
			$order_id = wc_get_order_id_by_order_key( urldecode( $_GET['key'] ) );
			$order    = wc_get_order( $order_id );

			$nuvei_params['billing_first_name'] = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_first_name : $order->get_billing_first_name();
			$nuvei_params['billing_last_name']  = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_last_name : $order->get_billing_last_name();
			$nuvei_params['billing_address_1']  = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_1 : $order->get_billing_address_1();
			$nuvei_params['billing_address_2']  = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_2 : $order->get_billing_address_2();
			$nuvei_params['billing_state']      = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_state : $order->get_billing_state();
			$nuvei_params['billing_city']       = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_city : $order->get_billing_city();
			$nuvei_params['billing_postcode']   = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_postcode : $order->get_billing_postcode();
			$nuvei_params['billing_country']    = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_country : $order->get_billing_country();
		}

		$nuvei_params['no_prepaid_card_msg']                     = __( 'Sorry, we\'re not accepting prepaid cards at this time.', 'woocommerce-gateway-nuvei' );
		$nuvei_params['allow_prepaid_card']                      = apply_filters( 'wc_nuvei_allow_prepaid_card', true ) ? 'yes' : 'no';
		$nuvei_params['nuvei_checkout_require_billing_address'] = apply_filters( 'wc_nuvei_checkout_require_billing_address', false ) ? 'yes' : 'no';

		// merge localized messages to be use in JS
		$nuvei_params = array_merge( $nuvei_params, $this->get_localized_messages() );

		wp_localize_script( 'woocommerce_nuvei', 'wc_nuvei_params', apply_filters( 'wc_nuvei_params', $nuvei_params ) );
	}

    public function getCreditCardType($cardNumber, $terminalId, $currency)
    {
        if (empty($cardNumber)) {
            return false;
        }

        $options = get_option("woocommerce_nuvei_settings");

        $cardTypeValidationUrl = $options['testmode'] == 'yes' ?'https://testpayments.nuvei.com/merchant/paymentpage':'https://payments.nuvei.com/merchant/paymentpage';
        $cardTypeValidationUrl = str_replace('paymentpage', 'card/type/getName', $cardTypeValidationUrl);

        $soap = curl_init();

        $data_string = "bin=" . $cardNumber . "&terminalNumber=" . $terminalId . "&currency=" . $currency ;

        curl_setopt($soap, CURLOPT_URL, $cardTypeValidationUrl);
        curl_setopt($soap, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($soap, CURLOPT_CONNECTTIMEOUT, 61);
        curl_setopt($soap, CURLOPT_TIMEOUT,        61);
        curl_setopt($soap, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($soap, CURLOPT_POST,           true);
        curl_setopt($soap, CURLOPT_POSTFIELDS,     $data_string);
        curl_setopt($soap, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json'
        ));

        $result = curl_exec($soap);

        if (curl_errno($soap) > 0) {
            $result = array('errocurl' => curl_errno($soap), 'msgcurl' => curl_error($soap));
            wc_add_notice( curl_error($soap), 'error' );
        }

        curl_close($soap);

        $result = json_decode($result);

        if($result->status === "OK") {
            return $this->mapCardType($result->cardName);
        } else return false;
    }

    public function process_subscription($order, $product, $secureCardMerchantRef, $terminalId, $secret)
    {
        $storedSubscriptionRef = $product->get_meta('merchantRef');
        $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $storedSubscriptionRef . $secureCardMerchantRef . date('U'));
        $startDate = date('d-m-Y');

        $XmlSubscriptionRegRequest = new NuveiXmlSubscriptionRegRequest($merchantRef, $terminalId, $storedSubscriptionRef, $secureCardMerchantRef, $startDate);

        $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
        $response = $XmlSubscriptionRegRequest->ProcessRequestToGateway($secret, $serverUrl);

        if ($response->IsError()) {
            $nuveiResponse = 'AN ERROR OCCURED! Error details: ' . $response->ErrorString();
            wc_add_notice( $nuveiResponse, 'error' );
            return false;
        } else {
            $order->update_meta_data( 'subscriptionMerchantRef', $merchantRef);
            $order->update_meta_data( 'terminalId', $terminalId);

            $order->add_order_note( $product->get_title() . ' subscription added #'. $response->MerchantReference() );
            $order->save();
            return true;
        }
    }

	/**
	 * Process the payment
	 *
	 * @param int  $order_id Reference.
	 * @param bool $retry Should we retry on fail.
	 * @param bool $force_customer Force user creation.
	 *
	 * @throws Exception If payment will not be accepted.
	 *
	 * @return array|void
	 */
	public function process_payment( $order_id, $retry = true, $force_customer = false ) {
	    session_start();

        $order = wc_get_order($order_id);
        $orderTotal = $order->get_total();

        $currency = wc_clean(wp_unslash($order->get_currency()));
        if($currency == $this->currency && $this->publishable_key && $this->secret_key) {
            $terminalId = $this->publishable_key;
            $secret = $this->secret_key;
            $multicurrency = $this->multicurrency;
        } else if($currency == $this->currency2 && $this->publishable_key2 && $this->secret_key2) {
            $terminalId = $this->publishable_key2;
            $secret = $this->secret_key2;
            $multicurrency = $this->multicurrency2;
        } else if($currency == $this->currency3 && $this->publishable_key3 && $this->secret_key3) {
            $terminalId = $this->publishable_key3;
            $secret = $this->secret_key3;
            $multicurrency = $this->multicurrency3;
        } else if ($this->multicurrency == 'yes') {
            $terminalId = $this->publishable_key;
            $secret = $this->secret_key;
            $multicurrency = $this->multicurrency;
        } else if ($this->multicurrency2 == 'yes') {
            $terminalId = $this->publishable_key2;
            $secret = $this->secret_key2;
            $multicurrency = $this->multicurrency2;
        } else if ($this->multicurrency3 == 'yes') {
            $terminalId = $this->publishable_key3;
            $secret = $this->secret_key3;
            $multicurrency = $this->multicurrency3;
        }

        $wc_token_id = wc_clean(wp_unslash($_POST['wc-nuvei-payment-token']));

        // Secure Card payment ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        if($wc_token_id !== null && $wc_token_id !== "new") {

            $wc_token    = new WC_Nuvei_Payment_Token_CC(WC_Payment_Tokens::get( $wc_token_id ));

            foreach ( WC()->cart->get_cart() as $item ) {
                if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                    $product = wc_get_product( $item['product_id'] );

                    if($wc_token_id !== "new") {
                        if(!$this->process_subscription($order, $product, $wc_token->get_merchant_ref(), $terminalId, $secret)) {
                            return;
                        } else {
                            $orderTotal -= $product->get_meta('_subscription_sign_up_fee');
                            $orderTotal -= $product->get_meta('_subscription_price');
                        }
                    }
                }
            }

            # Set up the authorisation object
            $amount = number_format(wc_clean(wp_unslash($orderTotal)), 2, '.', '');
            $cardNumber = $wc_token->get_token();
            $cardType = 'SECURECARD';

            $receiptPageUrl = $this->get_return_url($order);

            if($amount <= 0) {
                $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Order successfully processed.', 'woocommerce' ) );

                $order->save();

                WC()->mailer()->customer_invoice( $order );

                wc_reduce_stock_levels( $order_id );

                WC()->cart->empty_cart();

                return array(
                    'result' => 'success',
                    'redirect' => $receiptPageUrl,
                );
            }

            $XmlAuthRequest = new NuveiGatewayXmlAuthRequest($terminalId, $order_id, $currency, $amount, $cardNumber, $cardType);

            if ($multicurrency=='yes') $XmlAuthRequest->SetMultiCur();


            if(true || $this->avs) { //always send AVS data on xml requests and let gateway decide if will use it or not
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
            $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';

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

                return array(
                    'result' => 'success',
                    'redirect' => $receiptPageUrl,
                );
            }
            else {
                wc_add_notice( $nuveiResponse, 'error' );
            }

        } else if ( $this->nuvei_integration_type=='hpp') {
            // HPP payment ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

            $orderHasSubscription = false;
            foreach ( WC()->cart->get_cart() as $item ) {
                if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                    $orderHasSubscription = true;

                    $product = wc_get_product( $item['product_id'] );
                    $orderTotal -= $product->get_meta('_subscription_sign_up_fee');
                    $orderTotal -= $product->get_meta('_subscription_price');
                }
            }

			$dateTime = date('d-m-Y:H:i:s:000');
			$receiptPageUrl = $this->get_return_url($order);

			if(!$terminalId) {
                wc_add_notice( 'Payment plugin misconfigured: terminal for current currency not available.', 'error' );
                return;
            }

            $HPP_VARS = '';
            if($this->avs) {
                $address1 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_1 : $order->get_billing_address_1();
                $address2 = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_address_2 : $order->get_billing_address_2();
                $postcode = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_postcode : $order->get_billing_postcode();
                $city = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_city : $order->get_billing_city();
                $region = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_state : $order->get_billing_state();
                $country = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_country : $order->get_billing_country();
                $email = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_email : $order->get_billing_email();
                $phone = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_phone : $order->get_billing_phone();
                $HPP_VARS = '&ADDRESS1='.$address1.'&ADDRESS2='.$address2.'&POSTCODE='.$postcode.'&CITY='.$city.'&REGION='.$region.'&COUNTRY='.$country.'&EMAIL='.$email.'&PHONE='.$phone;
            }
            $firstName = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_first_name : $order->get_billing_first_name();
            $lastName = version_compare( WC_VERSION, '3.0.0', '<' ) ? $order->billing_last_name : $order->get_billing_last_name();

			$amount = number_format(wc_clean(wp_unslash($orderTotal)), 2, '.', '');
			$hash = md5($terminalId . $order_id . ($multicurrency=='yes' ? $currency : '') . $amount . $dateTime . $receiptPageUrl . $secret);

            if($orderHasSubscription) {
                $action = 'register';
                $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $order_id . $firstName . $lastName . date('U'));
                $hash = md5($terminalId . $merchantRef . $dateTime . $action . $secret);

                $orderDetails = array();
                $orderDetails['orderId'] = $order_id;
                $orderDetails['terminalId'] = $terminalId;

                $_SESSION['wc_gateway_nuvei_'.$merchantRef] = $orderDetails;

                $redirectUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/paymentpage':'https://payments.nuvei.com/merchant/paymentpage';
                $redirectUrl = str_replace('/paymentpage', '/securecardpage', $redirectUrl);
                $redirectUrl .= '?ACTION=' . $action . '&TERMINALID=' . $terminalId . '&MERCHANTREF=' . $merchantRef . '&DATETIME=' . $dateTime . '&HASH=' . $hash;
            } else {
                if($this->securecard) {
                    $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $order_id . $firstName . $lastName . date('U'));
                    $SECURECARDMERCHANTREF = '&SECURECARDMERCHANTREF='.$merchantRef;
                }

                $redirectUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/paymentpage':'https://payments.nuvei.com/merchant/paymentpage';
                $redirectUrl .= '?TERMINALID=' . $terminalId . '&ORDERID=' . $order_id . '&CARDHOLDERNAME=' . $firstName .' '.$lastName . '&CURRENCY=' . wc_clean(wp_unslash($order->get_currency())) . '&AMOUNT=' . $amount . '&DATETIME=' . $dateTime . '&RECEIPTPAGEURL=' . urlencode($receiptPageUrl) . $HPP_VARS . '&HASH=' . $hash . $SECURECARDMERCHANTREF;
            }

			return array(
				'result' => 'success',
				'redirect' => $redirectUrl,
			);
		} else if ( $this->nuvei_integration_type=='xml') {
            // XML payment ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

            $csrfToken = wc_clean(wp_unslash($_POST['csrf-token']));
		    if(!hash_equals($_SESSION['CSRF-Token'], $csrfToken)) {
                unset($_SESSION['CSRF-Token']);

                return array(
                    'result' => 'success',
                    'redirect' => wc_get_checkout_url(),
                );
            }
            unset($_SESSION['CSRF-Token']);

            if(!$terminalId) {
                wc_add_notice( 'Payment plugin misconfigured: terminal for current currency not available.', 'error' );
                return;
            }

            $this->get_terminal_settings();

            $cardType = wc_clean(wp_unslash($_POST['card-type']??''));
            $isApplePay = false;
            if($cardType === "APPLEPAY") $isApplePay = true;

            $orderHasSubscription = false;
            foreach ( WC()->cart->get_cart() as $item ) {
                if ( class_exists( 'WC_Subscriptions_Product' ) &&  WC_Subscriptions_Product::is_subscription( $item['product_id'] )) {
                    $orderHasSubscription = true;

                    $product = wc_get_product( $item['product_id'] );
                    $orderTotal -= $product->get_meta('_subscription_sign_up_fee');
                    $orderTotal -= $product->get_meta('_subscription_price');
                }
            }

			# Set up the authorisation object
			$amount = number_format(wc_clean(wp_unslash($orderTotal)), 2, '.', '');
            if(!$isApplePay) {
                $cardNumber = str_replace(' ', '', wc_clean(wp_unslash($_POST['card-number'])));
                $cardType = strtoupper($this->getCreditCardType($cardNumber, $terminalId, $currency));
                $cardHolder = wc_clean(wp_unslash($_POST['card-name']));
                $cardExpiry = wc_clean(wp_unslash($_POST['card-expiry']));
                $cvv = wc_clean(wp_unslash($_POST['cvc']));
            } else {
                $cardNumber = wc_clean(wp_unslash($_POST['card-number']));
                $cardHolder = '';
                $cardExpiry = '';
                $cvv = '';
            }

			if(isset($_POST['wc-nuvei-new-payment-method']) && wc_clean(wp_unslash($_POST['wc-nuvei-new-payment-method'])) === "true" && !$orderHasSubscription && !$isApplePay) {
			    $this->add_payment_method($terminalId);
            }

            $cartType3dsEnabled = true;
            if($this->enabled3ds && !$isApplePay && isset($this->terminal_settings['SUPPORTED_CARDTYPES_3DS'])) {
                //check if cardType supports 3ds
                $acceptedCards = [];
                foreach ($this->terminal_settings['SUPPORTED_CARDTYPES_3DS']['CARDTYPE'] as $supportedCardType) {
                    $mappedCardType = strtoupper($this->mapCardType($supportedCardType));
                    if($mappedCardType && !in_array($mappedCardType, $acceptedCards))
                        array_push($acceptedCards, $mappedCardType);
                }

                if(!in_array($cardType, $acceptedCards))
                    $cartType3dsEnabled = false;
            }

			if($this->enabled3ds && !$isApplePay && $cartType3dsEnabled) {
			    //save card details in WC session to be processed after 3DS response
                $amount = number_format($order->get_total(), 2, '.', '');
                $cardDetails['testmode'] = $this->testmode;
                $cardDetails['avs'] = $this->avs;
                $cardDetails['multicurrency'] = $multicurrency;
                $cardDetails['terminalId'] = $terminalId;
                $cardDetails['secret'] = $secret;
                $cardDetails['currency'] = $currency;
                $cardDetails['amount'] = $amount;
                $cardDetails['cardNumber'] = $cardNumber;
                $cardDetails['cardHolder'] = $cardHolder;
                $cardDetails['cardExpiry'] = $cardExpiry;
                $cardDetails['cardType'] = $cardType;
                $cardDetails['cvv'] = $cvv;
                $cardDetails['orderHasSubscription'] = $orderHasSubscription;

                $cardDetails['checkSum'] = md5($cardDetails['testmode'] . ':' . $cardDetails['avs'] . ':'
                    . $cardDetails['multicurrency'] . ':' . $cardDetails['terminalId'] . ':' . $cardDetails['secret']
                    . ':' . $cardDetails['currency'] . ':' . $cardDetails['amount'] . ':'  . $cardDetails['cardNumber']
                    . ':' . $cardDetails['cardHolder'] . ':' . $cardDetails['cardExpiry'] . ':' . $cardDetails['cardType']
                    . ':' . $cardDetails['cvv'] . ':' . $cardDetails['orderHasSubscription'] );

                $_SESSION['wc_gateway_nuvei_'.$order_id] = $cardDetails;
                //end save

                $dateTime = date('d-m-Y:H:i:s:000');
                $hash = md5($terminalId . $order_id . $cardNumber . $cardExpiry . $cardType . $amount . $dateTime . $secret);

                $redirectUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/mpi':'https://payments.nuvei.com/merchant/mpi';

                $request3ds = array();
                $request3ds['TERMINALID'] = $terminalId;
                $request3ds['CARDHOLDERNAME'] = $cardHolder;
                $request3ds['CARDNUMBER'] = $cardNumber;
                $request3ds['CARDEXPIRY'] = $cardExpiry;
                $request3ds['CARDTYPE'] = $cardType;
                $request3ds['AMOUNT'] = $amount;
                $request3ds['CURRENCY'] = $currency;
                $request3ds['ORDERID'] = $order_id;
                $request3ds['CVV'] = $cvv;
                $request3ds['DATETIME'] = $dateTime;
                $request3ds['HASH'] = $hash;

                $request3ds['redirectUrl'] = $redirectUrl;

                $request3ds['checkSum'] = md5($request3ds['TERMINALID'] . ':' . $request3ds['CARDHOLDERNAME'] . ':' .
                    $request3ds['CARDNUMBER'] . ':' . $request3ds['CARDEXPIRY'] . ':' . $request3ds['CARDTYPE'] . ':' .
                    $request3ds['AMOUNT'] . ':' . $request3ds['CURRENCY'] . ':' . $request3ds['ORDERID'] . ':' .
                    $request3ds['CVV'] . ':' . $request3ds['DATETIME'] . ':' . $request3ds['HASH'] . ':' . $request3ds['redirectUrl'] );

                $_SESSION['request3ds'] = $request3ds;

                return array(
                    'result' => 'success',
                    'redirect' => wc_get_checkout_url(),
                );
            } else {
			    if($orderHasSubscription && !$isApplePay) {
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

                            if(!$this->process_subscription($order, $product, $merchantReference, $terminalId, $secret)) return;
                        }
                    }
                }

                $receiptPageUrl = $this->get_return_url($order);

                if($amount <= 0) {
                    $order->update_status( apply_filters( 'woocommerce_gateway_nuvei_process_payment_order_status', 'processing', $order ), __( 'Order successfully processed.', 'woocommerce' ) );

                    $order->save();

                    WC()->mailer()->customer_invoice( $order );

                    wc_reduce_stock_levels( $order_id );

                    WC()->cart->empty_cart();

                    return array(
                        'result' => 'success',
                        'redirect' => $receiptPageUrl,
                    );
                }

                $XmlAuthRequest = new NuveiGatewayXmlAuthRequest($terminalId, $order_id, $currency, $amount, $cardNumber, $cardType);

                if ($cardType == "APPLEPAY") {
                    $XmlAuthRequest->SetApplePayLoad($cardNumber);
                } else if ($cardType != "SECURECARD") $XmlAuthRequest->SetNonSecureCardCardInfo($cardExpiry, $cardHolder);
                if ($cvv != "") $XmlAuthRequest->SetCvv($cvv);
                if ($multicurrency=='yes') $XmlAuthRequest->SetMultiCur();

                if(true || $this->avs) { //always send AVS data on xml requests and let gateway decide if will use it or not
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
                $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
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

                    return array(
                        'result' => 'success',
                        'redirect' => $receiptPageUrl,
                    );
                }
                else {
                    wc_add_notice( $nuveiResponse, 'error' );
                }
            }
		}

	}

	/**
     * Refund a charge
     * @param  int $order_id
     * @param  float $amount
     * @return bool
     */
	public function process_refund( $order_id, $amount = null, $reason = '' ) {
        $order = wc_get_order( $order_id );

        if ( ! $order || ! $order->get_transaction_id() || $amount <= 0 ) {
            if($amount <= 0)
                throw new Exception("Amount should be positive.");
            return false;
        }

        $reason = 'Refund reason: '.($reason == ''?'none':$reason);
        $amount = number_format(wc_clean(wp_unslash($amount)), 2, '.', '');

        $currency = wc_clean(wp_unslash($order->get_currency()));

        if($currency == $this->currency && $this->publishable_key && $this->secret_key) {
            $terminalId = $this->publishable_key;
            $secret = $this->secret_key;
        } else if($currency == $this->currency2 && $this->publishable_key2 && $this->secret_key2) {
            $terminalId = $this->publishable_key2;
            $secret = $this->secret_key2;
        } else if($currency == $this->currency3 && $this->publishable_key3 && $this->secret_key3) {
            $terminalId = $this->publishable_key3;
            $secret = $this->secret_key3;
        } else if($this->multicurrency == 'yes') {
            $terminalId = $this->publishable_key;
            $secret = $this->secret_key;
        } else if($this->multicurrency2 == 'yes') {
            $terminalId = $this->publishable_key2;
            $secret = $this->secret_key2;
        } else if($this->multicurrency3 == 'yes') {
            $terminalId = $this->publishable_key3;
            $secret = $this->secret_key3;
        }
        if(!$terminalId) {
            throw new Exception( 'Payment plugin misconfigured: terminal for current currency not available.');
            return false;
        }

        $uniqueRef = $order->get_transaction_id();
        $operator = 'Woocommerce payment plugin';

        $XmlRefundRequest = new NuveiGatewayXmlRefundRequest($terminalId, $order_id, $amount, $operator, $reason);
        $XmlRefundRequest->SetUniqueRef($uniqueRef);

        $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
        $response = $XmlRefundRequest->ProcessRequestToGateway($secret, $serverUrl);

        $expectedResponseHash = md5($terminalId.$response->UniqueRef().$amount.$response->DateTime() . $response->ResponseCode() . $response->ResponseText().$secret);

        $responseBody = '';
        if ($response->IsError()) {
            $responseBody .= 'AN ERROR OCCURED! Error details: ' . $response->ErrorString();
        }
        else {
            if ($expectedResponseHash == $response->Hash() && $response->ResponseCode() == 'A') {
                $order->add_order_note( 'Refund processed correctly #'. $response->UniqueRef() ."\n". $reason );
                $order->save();
                return true;
            } else {
                $responseBody .= 'AN ERROR OCCURED! Error details: ' . $response->ResponseText();
            }
        }

        if($responseBody) {
            throw new Exception($responseBody);
        }

        return true;
    }

	/**
     * Sends the failed order email to admin
     *
     * @version 3.1.0
     * @since 3.1.0
     * @param int $order_id
     * @return null
     */
	public function send_failed_order_email( $order_id ) {
        $emails = WC()->mailer()->get_emails();
        if ( ! empty( $emails ) && ! empty( $order_id ) ) {
            $emails['WC_Email_Failed_Order']->trigger( $order_id );
        }
    }

	/**
	 * Logs
	 *
	 * @since 3.1.0
	 * @version 3.1.0
	 *
	 * @param string $message
	 */
	public function log( $message ) {
		if ( $this->logging ) {
			Nuvei_Gateway_for_WC::log( $message );
		}
	}


	public function add_payment_method($terminalId = null) {
        $error     = false;
        $error_msg = __( 'There was a problem adding the payment method.', 'woocommerce-gateway-nuvei' );

        session_start();
        $csrfToken = wc_clean(wp_unslash($_POST['csrf-token']));
        if ( (!hash_equals($_SESSION['CSRF-Token'], $csrfToken) && wc_clean(wp_unslash($_POST['wc-nuvei-new-payment-method'])) !== "true") || ! is_user_logged_in() ) {
            $error = true;
        }

        if(($terminalId == null || $this->publishable_key == $terminalId) && $this->secret_key) {
            $terminalId = $this->publishable_key;
            $secret = $this->secret_key;
            $currency = $this->currency;
        } else if(($terminalId == null || $this->publishable_key2 == $terminalId) && $this->secret_key2) {
            $terminalId = $this->publishable_key2;
            $secret = $this->secret_key2;
            $currency = $this->currency2;
        } else if(($terminalId == null || $this->publishable_key3 == $terminalId) && $this->secret_key3) {
            $terminalId = $this->publishable_key3;
            $secret = $this->secret_key3;
            $currency = $this->currency3;
        }

        $cardHolderName = wc_clean(wp_unslash($_POST['card-name']));
        $cardNumber = str_replace(' ', '', wc_clean(wp_unslash($_POST['card-number'])));
        $cardExpiry = wc_clean(wp_unslash($_POST['card-expiry']));
        $cardType = strtoupper($this->getCreditCardType($cardNumber, $terminalId, $currency));
        $cvv = wc_clean(wp_unslash($_POST['cvc']));

        $last4 = substr(wc_clean(wp_unslash($_POST['card-number'])), -4);
        $month = substr(wc_clean(wp_unslash($_POST['card-expiry'])), 0, 2);
        $year = '20' . substr(wc_clean(wp_unslash($_POST['card-expiry'])), -2);

        $user                 = wp_get_current_user();
        if ( $user->ID ) {
            $address1 = get_user_meta( $user->ID, 'billing_address_1', true );
            $postcode = get_user_meta( $user->ID, 'billing_postcode', true );
            $phone = get_user_meta( $user->ID, 'billing_phone', true );
            $email = get_user_meta( $user->ID, 'billing_email', true );
            $email = $email ? $email : $user->user_email;
        } else {
            $address1 = '';
            $postcode = '';
            $email = '';
            $phone = '';
        }

        $result = $this->add_payment_method_reg_request($terminalId, $secret, $cardHolderName, $cardNumber, $cardExpiry, $cardType, $cvv, $last4, $month, $year, $address1, $postcode, $email, $phone);

        if(isset($result['error'])) {
            $error = true;
            $error_msg = $result['error_msg'];
        }

        if ( $error ) {
            wc_add_notice( $error_msg, 'error' );

            return array(
                'result'   => 'failure',
                'redirect' => wc_get_endpoint_url( 'payment-methods' ),
            );
        }

        if(wc_clean(wp_unslash($_POST['wc-nuvei-new-payment-method'])) !== "true")
            return array(
                'result'   => 'success',
                'redirect' => wc_get_endpoint_url( 'payment-methods' ),
            );
    }

    public function add_payment_method_reg_request($terminalId, $secret, $cardHolderName, $cardNumber, $cardExpiry, $cardType, $cvv, $last4, $month, $year, $address1, $postcode, $email, $phone) {
        $merchantRef = 'MREF_wc-' . md5($terminalId . $secret . $last4 . $cardExpiry . $cardHolderName . date('U'));

        $XmlSecureCardRegRequest = new NuveiXmlSecureCardRegRequest($merchantRef, $terminalId, $cardNumber, $cardExpiry, $cardType, $cardHolderName);
        $XmlSecureCardRegRequest->SetCvv($cvv);
        $XmlSecureCardRegRequest->SetAddress1($address1);
        $XmlSecureCardRegRequest->SetPostcode($postcode);
        $XmlSecureCardRegRequest->SetEmail($email);
        $XmlSecureCardRegRequest->SetPhone($phone);

        $serverUrl = $this->testmode == 'yes' ?'https://testpayments.nuvei.com/merchant/xmlpayment':'https://payments.nuvei.com/merchant/xmlpayment';
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
            $wc_token->set_gateway_id( $this->id );
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


    public function mapCardType($cardType)
    {
        switch ($cardType) {
            case 'Visa Credit':
            case 'Visa Debit':
            case 'VISA':
            case 'DELTA':
            case 'VISA DEBIT':
                return 'visa';
                break;
            case 'MasterCard':
            case 'Debit MasterCard':
            case 'MASTERCARD':
            case 'LASER':
            case 'SWITCH':
            case 'UKASH NEO':
            case 'DEBIT MASTERCARD':
                return 'masterCard';
                break;
            case 'Maestro':
            case 'MAESTRO':
                return 'maestro';
                break;
            case 'Visa Electron':
            case 'ELECTRON':
                return 'electron';
                break;
            case 'American Express':
            case 'AMEX':
                return 'amex';
                break;
            case 'SOLO':
                return 'solo';
                break;
            case 'DINERS':
                return 'diners';
                break;
            case 'JCB':
                return 'jcb';
                break;
            case 'SECURECARD':
                return 'securecard';
                break;
            case 'DISCOVER':
                return 'discover';
                break;
            case 'SANTANDER':
                return 'santander';
                break;
            case 'GIFTCARD':
                return 'giftcard';
                break;
            case 'SHELL':
                return 'shell';
                break;
            case 'UNIONPAY':
                return 'unionpay';
                break;
            case 'APPLEPAY':
                return 'applepay';
                break;
            case 'GOOGLEPAY':
                return 'googlepay';
                break;
            case 'ACH JH':
                return 'ach jh';
                break;
            case 'ACH INTEGRAPAY':
                return 'ach integrapay';
                break;
            default:
                return false;
                break;
        }
    }
}
