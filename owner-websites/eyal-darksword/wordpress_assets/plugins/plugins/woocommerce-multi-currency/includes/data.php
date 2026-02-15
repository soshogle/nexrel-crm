<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Data {
	public static $current_currency;
	protected static $instance = null;
	protected static $allow_html = null;
	private $params;
	public static $pos_options;
	public $currencies_list;

	private $user_ip = null;
	private $transient_key = null;

	/**
	 * WOOMULTI_CURRENCY_Data constructor.
	 * Init setting
	 */
	public function __construct() {
		global $wmc_settings;
		if ( ! $wmc_settings ) {
			$wmc_settings                  = get_option( 'woo_multi_currency_params', array() );
			$wmc_settings['currency_core'] = get_option( 'woocommerce_currency' );
			$wmc_settings['decimals_core'] = get_option( 'woocommerce_price_num_decimals' );
		}

		$this->params = $wmc_settings;

		$args = array(
			'enable'                                          => 0,
			'enable_fixed_price'                              => 0,
			'ignore_exchange_rate'                            => 0,
			'fixed_structure_currency'                        => 'default',
			'currency_default'                                => $wmc_settings['currency_core'],
			'enable_switch_currency_by_js'                    => 0,
			'currency'                                        => array( $wmc_settings['currency_core'] ),
			'currency_rate'                                   => array( 1 ),
			'currency_rate_fee'                               => array( 0 ),
			'currency_rate_fee_type'                          => array( 0 ),
			'currency_hidden'                                 => array( 0 ),
			'currency_decimals'                               => array( $wmc_settings['decimals_core'] ),
			'currency_custom'                                 => array(),
			'currency_thousand_separator'                     => array(),
			'currency_decimal_separator'                      => array(),
			'currency_pos'                                    => array(),
			'auto_detect'                                     => 0,
			'approximate_position'                            => array(),
			'approximately_priority'                          => 0,
			'approximately_label'                             => 'Approximately:',
			'initial_currency'                                => '',
			'user_login_switch'                               => 0,
			'enable_currency_by_country'                      => 0,
			'allow_translatepress_and_widget_change_currency' => '',

			/*Checkout*/
			'enable_multi_payment'                            => 0,
			'enable_cart_page'                                => 0,
			'billing_shipping_currency'                       => 0,

			/*Design*/
			'enable_design'                                   => 0,
			'title'                                           => '',
			'design_position'                                 => 0,
			'enable_collapse'                                 => 0,
			'disable_collapse'                                => 0,
			'max_height'                                      => '',
			'text_color'                                      => '#fff',
			'background_color'                                => '#212121',
			'main_color'                                      => '#f78080',
			'hover_color'                                     => '',
			'name_background_color'                           => '#8d4747',
			'flag_custom'                                     => '',
			'sidebar_position'                                => '',
			'sidebar_style'                                   => 0,
			'sidebar_layout'                                  => 'split',

			//Product price switcher
			'price_switcher'                                  => 0,
			'price_switcher_layout'                           => 'split',
			'price_switcher_position'                         => 20,
			'click_to_expand_currencies'                      => '',

			'price_collate'             => 0,
			'price_collate_single'      => 10,
			'price_collate_archive'     => 'after_price',
			'price_collate_layout'      => 'inline',
			'price_collate_title'       => '',

			//shortcode options
			'shortcode_position'        => '',
			'pc_pos_left'               => 0,
			'pc_pos_top'                => 0,
			'pc_pos_right'              => 0,
			'pc_pos_bottom'             => 0,
			'mb_pos_left'               => 0,
			'mb_pos_top'                => 0,
			'mb_pos_right'              => 0,
			'mb_pos_bottom'             => 0,
			'shortcode_bg_color'        => '',
			'shortcode_active_bg_color' => '',
			'shortcode_color'           => '',
			'shortcode_active_color'    => '',
			'shortcode_border_color'    => 0,

			/*Auto update*/
			'finance_api'               => 0,
			'wise_api_token'            => '',
			'openexchangerates_app_id'  => '',
			'exchangeratesapi_key'      => '',
			'currencyapi_key'           => '',
			'enable_send_email'         => 0,
			'is_checkout'               => 0,
			'is_cart'                   => 0,
			'conditional_tags'          => '',
			'custom_css'                => '',
			'rate_decimals'             => 5,
			'checkout_currency'         => $wmc_settings['currency_core'],
			'checkout_currency_args'    => array(),
			'geo_api'                   => 0,
			'external_geo_api'          => '',
			'geo_api_key'               => '',
			'use_session'               => 0,
			'set_storage'               => '',
			'storage_server'            => '',
			'storage_port'              => '',
			'email_custom'              => '',
			/*wpml*/
			'enable_wpml'               => 0,
			/*Update*/
			'key'                       => '',
			'update_exchange_rate'      => 0,
			'beauty_price_from'         => array(),
			'beauty_price_to'           => array(),
			'beauty_price_value'        => array(),
			'price_lower_bound'         => 0,
			'beauty_price_enable'       => 0,
//			'beauty_price_shipping'        => 0,
			'beauty_price_currencies'   => array(),
			'beauty_price_part'         => array(),
			'beauty_price_round_up'     => array(),
			'translatepress'            => array(),

			'equivalent_currency'                            => '',
			'cache_compatible'                               => 0,
			'load_ajax_filter_price'                         => 0,
			'bot_currency'                                   => 'default_currency',
			'click_to_expand_currencies_bar'                 => '',
			'expand_button_color'                            => '#cccccc',
			'expand_button_background'                       => '#999999',
			'expand_button_opacity'                          => 0.2,
			'sync_checkout_currency'                         => '',
			'only_shipping_country'                          => 0,
//			'currency_by_payment_method'           => '',
			'currency_by_payment_method_immediate'           => '',
			'currency_by_payment_method_without_reload_page' => '',
//			'do_not_reload_page'  => 0,//cause error with paypal checkout buttons, shipping cost not converting
		);

		$this->params = apply_filters( 'wmc_settings_args', wp_parse_args( $this->params, $args ) );

		self::$pos_options = array(
			'top-left'     => esc_html( 'Top - Left' ),
			'top-right'    => esc_html( 'Top - Right' ),
			'bottom-left'  => esc_html( 'Bottom - Left' ),
			'bottom-right' => esc_html( 'Bottom - Right' )
		);

		if ( ! empty( $_SERVER['HTTP_X_REAL_IP'] ) ) {
			$ip = $_SERVER['HTTP_X_REAL_IP'];
			if ( $splitPos = strpos( $ip, ',' ) ) {
				$ip = substr( $ip, 0, $splitPos );
			}
		} else if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
			if ( $splitPos = strpos( $ip, ',' ) ) {
				$ip = substr( $ip, 0, $splitPos );
			}
		} elseif ( isset( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = $_SERVER['REMOTE_ADDR'];
		} else {
			$ip = '';
		}
		$this->user_ip       = filter_var( $ip, FILTER_VALIDATE_IP );
		$this->transient_key = substr( md5( $this->user_ip ), 7, 23 );
	}


	/**
	 * @param bool $new
	 *
	 * @return WOOMULTI_CURRENCY_Data|null
	 */
	public static function get_ins( $new = false ) {
		// If the single instance hasn't been set, set it now.
		if ( $new || null === self::$instance ) {
			self::$instance = new self;
		}

		return self::$instance;
	}

	/**
	 * Enable currency switcher by JS
	 * @return mixed
	 */
	public function enable_switch_currency_by_js() {

		return apply_filters( 'wmc_enable_switch_currency_by_js', $this->params['enable_switch_currency_by_js'] );
	}

	/**
	 * Get option Price switcher
	 * @return mixed
	 */
	public function get_price_switcher() {
		return apply_filters( 'wmc_get_price_switcher', $this->params['price_switcher'] );
	}

	/**
	 * Get option Price collate
	 * @return mixed
	 */
	public function get_price_collate() {
		return apply_filters( 'wmc_get_price_collate', $this->params['price_collate'] );
	}

	/**
	 * Enable collapse
	 * @return mixed
	 */
	public function enable_collapse() {
		return apply_filters( 'wmc_enable_collapse', $this->params['enable_collapse'] );
	}

	/**
	 * Enable collapse
	 * @return mixed
	 */
	public function disable_collapse() {
		return apply_filters( 'wmc_enable_collapse', $this->params['disable_collapse'] );
	}

	/**
	 * Get sidebar style
	 * @return mixed
	 */
	public function get_sidebar_style() {
		return apply_filters( 'wmc_get_sidebar_style', $this->params['sidebar_style'] );
	}

	/**
	 * Get sidebar layout
	 * @return mixed
	 */
	public function get_sidebar_layout() {
		return apply_filters( 'wmc_get_sidebar_layout', $this->params['sidebar_layout'] );
	}

	/**
	 * Enable WPML.org. Product fields will be copied. Front end language change and currency follow.
	 * @return mixed
	 */
	public function enable_wpml() {
		return apply_filters( 'enable_wpml', $this->params['enable_wpml'] );
	}

	/**
	 * Get email custom address
	 * @return mixed
	 */
	public function get_email_custom() {
		return apply_filters( 'wmc_get_email_custom', $this->params['email_custom'] );
	}

	/**
	 * Check Geo APi
	 * @return mixed
	 */
	public function get_geo_api() {
		return apply_filters( 'wmc_get_geo_api', $this->params['geo_api'] );
	}
	public function get_geo_api_key() {
		return apply_filters( 'wmc_get_geo_api_key', $this->params['geo_api_key'] );
	}

	public function get_external_geo_api() {
		return apply_filters( 'wmc_get_geo_api', [ $this->params['external_geo_api'], $this->params['geo_api_key'] ] );
	}

	public function get_external_geo_country( $ip_add ) {
		$ex_geo_data = $this->get_external_geo_api();
		$ex_country = '';
		if ( empty( $ex_geo_data ) || ! is_array( $ex_geo_data ) || count( $ex_geo_data ) != 2 ) {
			return '';
		}

		switch ( $ex_geo_data[0] ) {
			case 'ip2location':
				if ( empty( $ex_geo_data[0] ) ) {
					return '';
				}

				$ex_url = "https://api.ip2location.io/?key={$ex_geo_data[1]}&ip={$ip_add}";
				$ex_response = wp_remote_get( $ex_url, array( 'timeout' => 15 ) );

				if ( is_wp_error( $ex_response ) ) {
					return new WP_Error( 'api_error', $ex_response->get_error_message() );
				}

				$ex_body = wp_remote_retrieve_body( $ex_response );
				$ex_data = json_decode( $ex_body, true );
				if ( $ex_data && is_array( $ex_data ) && isset( $ex_data['country_code'] ) ) {
					$ex_country = $ex_data['country_code'];
				}
				break;
		}
		return apply_filters( 'wmc_get_geo_api', $ex_country );
	}

	/**
	 * Check Conditional tag
	 * @return mixed
	 */
	public function get_conditional_tags() {
		return apply_filters( 'wmc_get_conditional_tags', $this->params['conditional_tags'] );
	}

	/**
	 * Check  hidden on cart page
	 * @return mixed
	 */
	public function is_cart() {
		return apply_filters( 'wmc_is_cart', $this->params['is_cart'] );
	}

	/**
	 * Check  hidden on checkout page
	 * @return mixed
	 */
	public function is_checkout() {
		return apply_filters( 'wmc_is_checkout', $this->params['is_checkout'] );
	}

	/**
	 * Get custom CSS
	 * @return mixed
	 */
	public function get_custom_css() {
		return apply_filters( 'wmc_get_custom_css', $this->params['custom_css'] );
	}

	/**
	 * Check send email when auto update exchange rate
	 * @return mixed
	 */
	public function check_send_email() {
		return apply_filters( 'wmc_check_send_email', $this->params['enable_send_email'] );
	}

	/**
	 * 237 countries.
	 * Two-letter country code (ISO 3166-1 alpha-2) => Three-letter currency code (ISO 4217).
	 *
	 * @param $country_code
	 *
	 * @return bool|mixed|string
	 */
	function get_currency_code( $country_code ) {
		if ( ! $country_code ) {
			return false;
		}
		$arg = array(
			'AF' => 'AFN',
			'AL' => 'ALL',
			'DZ' => 'DZD',
			'AS' => 'USD',
			'AD' => 'EUR',
			'AO' => 'AOA',
			'AI' => 'XCD',
			'AQ' => 'XCD',
			'AG' => 'XCD',
			'AR' => 'ARS',
			'AM' => 'AMD',
			'AW' => 'AWG',
			'AU' => 'AUD',
			'AT' => 'EUR',
			'AZ' => 'AZN',
			'BS' => 'BSD',
			'BH' => 'BHD',
			'BD' => 'BDT',
			'BB' => 'BBD',
			'BY' => 'BYR',
			'BE' => 'EUR',
			'BZ' => 'BZD',
			'BJ' => 'XOF',
			'BM' => 'BMD',
			'BT' => 'BTN',
			'BO' => 'BOB',
			'BA' => 'BAM',
			'BW' => 'BWP',
			'BV' => 'NOK',
			'BR' => 'BRL',
			'IO' => 'USD',
			'BN' => 'BND',
			'BG' => 'BGN',
			'BF' => 'XOF',
			'BI' => 'BIF',
			'KH' => 'KHR',
			'CM' => 'XAF',
			'CA' => 'CAD',
			'CV' => 'CVE',
			'KY' => 'KYD',
			'CF' => 'XAF',
			'TD' => 'XAF',
			'CL' => 'CLP',
			'CN' => 'CNY',
			'HK' => 'HKD',
			'CX' => 'AUD',
			'CC' => 'AUD',
			'CO' => 'COP',
			'KM' => 'KMF',
			'CG' => 'XAF',
			'CD' => 'CDF',
			'CK' => 'NZD',
			'CR' => 'CRC',
			'HR' => 'HRK',
			'CU' => 'CUP',
			'CY' => 'EUR',
			'CZ' => 'CZK',
			'DK' => 'DKK',
			'DJ' => 'DJF',
			'DM' => 'XCD',
			'DO' => 'DOP',
			'EC' => 'ECS',
			'EG' => 'EGP',
			'SV' => 'SVC',
			'GQ' => 'XAF',
			'ER' => 'ERN',
			'EE' => 'EUR',
			'ET' => 'ETB',
			'FK' => 'FKP',
			'FO' => 'DKK',
			'FJ' => 'FJD',
			'FI' => 'EUR',
			'FR' => 'EUR',
			'GF' => 'EUR',
			'TF' => 'EUR',
			'GA' => 'XAF',
			'GM' => 'GMD',
			'GE' => 'GEL',
			'DE' => 'EUR',
			'GH' => 'GHS',
			'GI' => 'GIP',
			'GR' => 'EUR',
			'GL' => 'DKK',
			'GD' => 'XCD',
			'GP' => 'EUR',
			'GU' => 'USD',
			'GT' => 'QTQ',
			'GG' => 'GGP',
			'GN' => 'GNF',
			'GW' => 'GWP',
			'GY' => 'GYD',
			'HT' => 'HTG',
			'HM' => 'AUD',
			'HN' => 'HNL',
			'HU' => 'HUF',
			'IS' => 'ISK',
			'IN' => 'INR',
			'ID' => 'IDR',
			'IR' => 'IRR',
			'IQ' => 'IQD',
			'IE' => 'EUR',
			'IM' => 'GBP',
			'IL' => 'ILS',
			'IT' => 'EUR',
			'JM' => 'JMD',
			'JP' => 'JPY',
			'JE' => 'GBP',
			'JO' => 'JOD',
			'KZ' => 'KZT',
			'KE' => 'KES',
			'KI' => 'AUD',
			'KP' => 'KPW',
			'KR' => 'KRW',
			'KW' => 'KWD',
			'KG' => 'KGS',
			'LA' => 'LAK',
			'LV' => 'EUR',
			'LB' => 'LBP',
			'LS' => 'LSL',
			'LR' => 'LRD',
			'LY' => 'LYD',
			'LI' => 'CHF',
			'LT' => 'EUR',
			'LU' => 'EUR',
			'MK' => 'MKD',
			'MG' => 'MGA',
			'MW' => 'MWK',
			'MY' => 'MYR',
			'MV' => 'MVR',
			'ML' => 'XOF',
			'MT' => 'EUR',
			'MH' => 'USD',
			'MQ' => 'EUR',
			'MR' => 'MRO',
			'MU' => 'MUR',
			'YT' => 'EUR',
			'MX' => 'MXN',
			'FM' => 'USD',
			'MD' => 'MDL',
			'MC' => 'EUR',
			'MN' => 'MNT',
			'ME' => 'EUR',
			'MS' => 'XCD',
			'MA' => 'MAD',
			'MZ' => 'MZN',
			'MM' => 'MMK',
			'NA' => 'NAD',
			'NR' => 'AUD',
			'NP' => 'NPR',
			'NL' => 'EUR',
			'AN' => 'ANG',
			'NC' => 'XPF',
			'NZ' => 'NZD',
			'NI' => 'NIO',
			'NE' => 'XOF',
			'NG' => 'NGN',
			'NU' => 'NZD',
			'NF' => 'AUD',
			'MP' => 'USD',
			'NO' => 'NOK',
			'OM' => 'OMR',
			'PK' => 'PKR',
			'PW' => 'USD',
			'PA' => 'PAB',
			'PG' => 'PGK',
			'PY' => 'PYG',
			'PE' => 'PEN',
			'PH' => 'PHP',
			'PN' => 'NZD',
			'PL' => 'PLN',
			'PT' => 'EUR',
			'PR' => 'USD',
			'QA' => 'QAR',
			'RE' => 'EUR',
			'RO' => 'RON',
			'RU' => 'RUB',
			'RW' => 'RWF',
			'SH' => 'SHP',
			'KN' => 'XCD',
			'LC' => 'XCD',
			'PM' => 'EUR',
			'VC' => 'XCD',
			'WS' => 'WST',
			'SM' => 'EUR',
			'ST' => 'STD',
			'SA' => 'SAR',
			'SN' => 'XOF',
			'RS' => 'RSD',
			'SC' => 'SCR',
			'SL' => 'SLL',
			'SG' => 'SGD',
			'SK' => 'EUR',
			'SI' => 'EUR',
			'SB' => 'SBD',
			'SO' => 'SOS',
			'ZA' => 'ZAR',
			'GS' => 'GBP',
			'SS' => 'SSP',
			'ES' => 'EUR',
			'LK' => 'LKR',
			'SD' => 'SDG',
			'SR' => 'SRD',
			'SJ' => 'NOK',
			'SZ' => 'SZL',
			'SE' => 'SEK',
			'CH' => 'CHF',
			'SY' => 'SYP',
			'TW' => 'TWD',
			'TJ' => 'TJS',
			'TZ' => 'TZS',
			'TH' => 'THB',
			'TG' => 'XOF',
			'TK' => 'NZD',
			'TO' => 'TOP',
			'TT' => 'TTD',
			'TN' => 'TND',
			'TR' => 'TRY',
			'TM' => 'TMT',
			'TC' => 'USD',
			'TV' => 'AUD',
			'UG' => 'UGX',
			'UA' => 'UAH',
			'AE' => 'AED',
			'GB' => 'GBP',
			'US' => 'USD',
			'UM' => 'USD',
			'UY' => 'UYU',
			'UZ' => 'UZS',
			'VU' => 'VUV',
			'VE' => 'VEF',
			'VN' => 'VND',
			'VI' => 'USD',
			'WF' => 'XPF',
			'EH' => 'MAD',
			'YE' => 'YER',
			'ZM' => 'ZMW',
			'ZW' => 'ZWD',
		);

		return isset( $arg[ $country_code ] ) ? apply_filters( 'wmc_get_currency_code', $arg[ $country_code ], $arg, $country_code ) : '';
	}

	/** Get country code by currency
	 *
	 * @param $currency_code
	 *
	 * @return array
	 */
	public function get_country_data( $currency_code ) {
		$countries     = array(
			'AFN' => 'AF',
			'ALL' => 'AL',
			'DZD' => 'DZ',
			'USD' => 'US',
			'EUR' => 'EU',
			'AOA' => 'AO',
			'XCD' => 'LC',
			'ARS' => 'AR',
			'AMD' => 'AM',
			'AWG' => 'AW',
			'AUD' => 'AU',
			'AZN' => 'AZ',
			'BSD' => 'BS',
			'BHD' => 'BH',
			'BDT' => 'BD',
			'BBD' => 'BB',
			'BYN' => 'BY',
			'BYR' => 'BY',
			'BZD' => 'BZ',
			'XOF' => 'BJ',
			'BMD' => 'BM',
			'BTN' => 'BT',
			'BOB' => 'BO',
			'BAM' => 'BA',
			'BWP' => 'BW',
			'NOK' => 'NO',
			'BRL' => 'BR',
			'BND' => 'BN',
			'BGN' => 'BG',
			'BIF' => 'BI',
			'KHR' => 'KH',
			'XAF' => 'CM',
			'CAD' => 'CA',
			'CVE' => 'CV',
			'KYD' => 'KY',
			'CLP' => 'CL',
			'CNY' => 'CN',
			'HKD' => 'HK',
			'COP' => 'CO',
			'KMF' => 'KM',
			'CDF' => 'CD',
			'NZD' => 'NZ',
			'CRC' => 'CR',
			'HRK' => 'HR',
			'CUP' => 'CU',
			'CUC' => 'CU',
			'CZK' => 'CZ',
			'DKK' => 'DK',
			'DJF' => 'DJ',
			'DOP' => 'DO',
			'ECS' => 'EC',
			'EGP' => 'EG',
			'SVC' => 'SV',
			'ERN' => 'ER',
			'ETB' => 'ET',
			'FKP' => 'FK',
			'FJD' => 'FJ',
			'GMD' => 'GM',
			'GEL' => 'GE',
			'GHS' => 'GH',
			'GIP' => 'GI',
			'QTQ' => 'GT',
			'GTQ' => 'GT',
			'GGP' => 'GG',
			'GNF' => 'GN',
			'GWP' => 'GW',
			'GYD' => 'GY',
			'HTG' => 'HT',
			'HNL' => 'HN',
			'HUF' => 'HU',
			'ISK' => 'IS',
			'INR' => 'IN',
			'IDR' => 'ID',
			'IRR' => 'IR',
			'IRT' => 'IR',
			'IQD' => 'IQ',
			'IMP' => 'IM',
			'GBP' => 'GB',
			'ILS' => 'IL',
			'JMD' => 'JM',
			'JPY' => 'JP',
			'JOD' => 'JO',
			'JEP' => 'JE',
			'KZT' => 'KZ',
			'KES' => 'KE',
			'KPW' => 'KP',
			'KRW' => 'KR',
			'KWD' => 'KW',
			'KGS' => 'KG',
			'LAK' => 'LA',
			'LBP' => 'LB',
			'LSL' => 'LS',
			'LRD' => 'LR',
			'LYD' => 'LY',
			'CHF' => 'CH',
			'MKD' => 'MK',
			'MGA' => 'MG',
			'MWK' => 'MW',
			'MYR' => 'MY',
			'MVR' => 'MV',
			'MRO' => 'MR',
			'MUR' => 'MU',
			'MRU' => 'MR',
			'MXN' => 'MX',
			'MDL' => 'MD',
			'MNT' => 'MN',
			'MAD' => 'MA',
			'MZN' => 'MZ',
			'MMK' => 'MM',
			'NAD' => 'NA',
			'NPR' => 'NP',
			'ANG' => 'AN',
			'XPF' => 'WF',
			'NIO' => 'NI',
			'NGN' => 'NG',
			'OMR' => 'OM',
			'PKR' => 'PK',
			'PAB' => 'PA',
			'PGK' => 'PG',
			'PYG' => 'PY',
			'PEN' => 'PE',
			'PHP' => 'PH',
			'PLN' => 'PL',
			'QAR' => 'QA',
			'RON' => 'RO',
			'RUB' => 'RU',
			'RWF' => 'RW',
			'SHP' => 'SH',
			'WST' => 'WS',
			'STD' => 'ST',
			'SAR' => 'SA',
			'RSD' => 'RS',
			'SCR' => 'SC',
			'SLL' => 'SL',
			'SGD' => 'SG',
			'SBD' => 'SB',
			'SOS' => 'SO',
			'ZAR' => 'ZA',
			'SSP' => 'SS',
			'LKR' => 'LK',
			'SDG' => 'SD',
			'SRD' => 'SR',
			'SZL' => 'SZ',
			'SEK' => 'SE',
			'SYP' => 'SY',
			'STN' => 'ST',
			'PRB' => 'ST',
			'TWD' => 'TW',
			'TJS' => 'TJ',
			'TZS' => 'TZ',
			'THB' => 'TH',
			'TOP' => 'TO',
			'TTD' => 'TT',
			'TND' => 'TN',
			'TRY' => 'TR',
			'TMT' => 'TM',
			'UGX' => 'UG',
			'UAH' => 'UA',
			'AED' => 'AE',
			'UYU' => 'UY',
			'UZS' => 'UZ',
			'VUV' => 'VU',
			'VEF' => 'VE',
			'VES' => 'VE',
			'VND' => 'VN',
			'YER' => 'YE',
			'ZMW' => 'ZM',
			'ZWD' => 'ZW',
			'BTC' => 'XBT',
			'ETH' => 'ETH',
			'MOP' => 'MO',
			'ZWL' => 'ZW',
		);
		$country_names = WC()->countries->countries;
		$data          = array();

		/*Custom Flag*/
		$custom_flags = $this->get_flag_custom();
		if ( is_array( $custom_flags ) && count( array_filter( $custom_flags ) ) ) {
			$countries = array_merge( $countries, $custom_flags );
		}

		if ( isset( $countries[ $currency_code ] ) && $currency_code ) {
			$data['code'] = $countries[ $currency_code ];
			switch ( $currency_code ) {
				case 'EUR':
					$data['name'] = esc_attr__( 'European Union', 'woocommerce-multi-currency' );
					break;
				default:
					$data['name'] = isset( $country_names[ $countries[ $currency_code ] ] ) ? $country_names[ $countries[ $currency_code ] ] : 'Unknown';
			}

		} else {
			$data['code'] = 'unknown';
			$data['name'] = 'Unknown';
		}

		return $data;
	}

	/**
	 * Custom flag
	 * @return mixed
	 */
	public function get_flag_custom() {
		$value      = array();
		$data_codes = $this->params['flag_custom'];
		if ( $data_codes ) {
			$args = array_filter( explode( "\n", $data_codes ) );
			if ( count( $args ) ) {
				foreach ( $args as $arg ) {
					$code = array_filter( explode( ",", strtoupper( $arg ) ) );
					if ( count( $code ) == 2 ) {
						$code = array_map( 'trim', $code );
						if ( $code[0] == 'EUR' ) {
							if ( isset( $value['EUR'] ) ) {
								continue;
							} else {
								$wmc_ip_info = $this->getcookie( 'wmc_ip_info' );
								if ( $wmc_ip_info ) {
									$geoplugin_arg = json_decode( base64_decode( $wmc_ip_info ), true );
									if ( $geoplugin_arg['country'] != $code[1] ) {
										continue;
									}
								} else {
									continue;
								}
							}
						}
						$value[ $code[0] ] = $code[1];
					}
				}
			}
		} else {
			return array();
		}

		return apply_filters( 'wmc_get_flag_custom', $value );
	}

	/**
	 * Set Cookie or Session
	 *
	 * @param $name
	 * @param $value
	 * @param int $time
	 * @param string $path
	 */
	public function setcookie( $name, $value, $time = 86400, $path = '/' ) {
		switch ( $this->use_session() ) {
			case 'woo_session':
				if ( WC()->session ) {
					$cookie = WC()->session->get_session_cookie();
					if ( ! $cookie ) {
						WC()->session->set_customer_session_cookie( true );
					}

					WC()->session->set( $name, $value );
				}
				break;
			case 'memcached':
				if ( class_exists( 'Memcached' ) ) {
					$mem = new Memcached();
					$mem->addServer( $this::get_param('storage_server' ), $this::get_param('storage_port' ) );
					$mem->set( $this->transient_key . '_' . $name, $value );
				}
				break;
			case 'redis':
				if ( class_exists( 'Redis' ) ) {
					$red = new Redis();
					try {
						@$red->connect( $this::get_param( 'storage_server' ), $this::get_param( 'storage_port' ) );
						$red->set( $this->transient_key . '_' . $name, $value );
					} catch ( RedisException $e ) {
						//***
					}
				}
				break;
			case 'session':
				@session_start();
				$_SESSION[ $name ] = $value;
				session_write_close();
				break;
			case 'cookie':
				$domain = apply_filters( 'wmc_setcookie_domain', '' );
				@setcookie( $name, $value, $time, $path, $domain );
				$_COOKIE[ $name ] = $value;
				break;
			case 'transient':
				$data = get_transient( $this->transient_key );
				if ( ! is_array( $data ) ) {
					$data = array();
				}
				$data[ $name ] = $value;
				set_transient( $this->transient_key, $data, $time ); //1 day
				break;
			default:
				break;
		}
	}

	/**
	 * Get Cookie or Session
	 *
	 * @param $name
	 *
	 * @return bool
	 */
	public function getcookie( $name ) {
		$value = null;

		switch ( $this->use_session() ) {
			case 'woo_session':
				if ( WC()->session ) {
					$value = WC()->session->get( $name );
				}
				break;
			case 'memcached':
				if ( $this->isset_cookie( $name ) AND class_exists( 'Memcached' ) ) {
					$mem = new Memcached();
					$mem->addServer( $this::get_param('storage_server' ), $this::get_param('storage_port' ) );
					$value = $mem->get( $this->transient_key . '_' . $name );
				}
				break;
			case 'redis':
				if ( $this->isset_cookie( $name ) AND class_exists( 'Redis' ) ) {
					$red = new Redis();
					try {
						@$red->connect( $this::get_param( 'storage_server' ), $this::get_param( 'storage_port' ) );
						$value = $red->get( $this->transient_key . '_' . $name );
					} catch ( RedisException $e ) {
						//***
					}
				}
				break;
			case 'session':
				if ( ! session_id() && ! WOOMULTI_CURRENCY_Data::is_request_to_rest_api() ) {
					/*Check !WOOMULTI_CURRENCY_Data::is_request_to_rest_api() here to fix loopback request error with site health*/
					@session_start();
				}
				$value = isset( $_SESSION[ $name ] ) ? $_SESSION[ $name ] : false;
				break;
			case 'cookie':
				$value = isset( $_COOKIE[ $name ] ) ? $_COOKIE[ $name ] : false;
				break;
			case 'transient':
				$data = get_transient( $this->transient_key );
				if ( ! is_array( $data ) ) {
					$data = array();
				}
				if ( isset( $data[ $name ] ) ) {
					$value = $data[ $name ];
				}
				break;
			default:
		}

		return $value;
	}

	/**
	 * Check storage to set currency data
	 * @return mixed
	 */
	public function use_session() {
		$base_storage = $this->params['set_storage'];
		if ( $base_storage == '' ) {
			if ( $this->params['use_session'] ) {
				$set_storage = 'session';
			} else {
				$set_storage = 'cookie';
			}
		} else {
			$set_storage = $base_storage;
		}

		return apply_filters( 'wmc_use_session', $set_storage );
	}

	public function isset_cookie( $name ) {
		$isset = false;
		switch ( $this->use_session() ) {
			case 'woo_session':
				if ( WC()->session ) {
					$isset = (bool) WC()->session->get( $name );
				}
				break;
			case 'memcached':
				$isset = false;
				if ( class_exists( 'Memcached' ) ) {
					$mem = new Memcached();
					$mem->addServer( $this::get_param('storage_server' ), $this::get_param('storage_port' ) );
					$isset = boolval( $mem->get( $this->transient_key . '_' . $name ) !== false && $mem->getResultCode() !== Memcached::RES_NOTFOUND );
				}
				break;
			case 'redis':
				$isset = false;
				if ( class_exists( 'Redis' ) ) {
					$red = new Redis();
					try {
						@$red->connect( $this::get_param( 'storage_server' ), $this::get_param( 'storage_port' ) );
						$isset = boolval( $red->exists( $this->transient_key . '_' . $name ) );
					} catch ( RedisException $e ) {
						//***
					}
				}
				break;
			case 'session':
				$isset = isset( $_SESSION[ $name ] );
				break;
			case 'cookie':
				$isset = isset( $_COOKIE[ $name ] );
				break;
			case 'transient':
				$isset = (bool) $this->getcookie( $name );
				break;
			default:
		}

		return $isset;
	}

	/**
	 * Get Links to redirect
	 * @return array
	 */
	public function get_links() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return array();
		}
		$links                  = array();
		$selected_currencies    = $this->get_list_currencies();
		$current_currency       = $this->get_current_currency();
		$checkout_currency_args = $this->get_checkout_currency_args();
		$url                    = ! empty( $_POST['wmc_current_url'] ) ? sanitize_text_field( $_POST['wmc_current_url'] ) : false;
		if ( count( $selected_currencies ) ) {
			foreach ( $selected_currencies as $k => $currency ) {
				if ( $currency['hide'] ) {
					continue;
				}
				/*Remove unsupported currencies from widget and currency bar on checkout and cart page*/
				if ( ( ( is_checkout() && ! is_product() ) || ( $this->enable_cart_page() && is_cart() ) ) && ! in_array( $k, $checkout_currency_args ) ) {
					continue;
				}
				/*Override min price and max price*/
				$arg = array( 'wmc-currency' => $k );
				if ( $current_currency == $k ) {
					if ( isset( $_GET['min_price'] ) ) {
						$arg['min_price'] = $_GET['min_price'];
					}
					if ( isset( $_GET['max_price'] ) ) {
						$arg['max_price'] = $_GET['max_price'];
					}
				} else {
					if ( isset( $_GET['min_price'] ) ) {
						$arg['min_price'] = intval( ( $_GET['min_price'] / $selected_currencies[ $current_currency ]['rate'] ) * $currency['rate'] );
					}
					if ( isset( $_GET['max_price'] ) ) {
						$arg['max_price'] = intval( ( $_GET['max_price'] / $selected_currencies[ $current_currency ]['rate'] ) * $currency['rate'] );
					}
				}
				$link        = apply_filters( 'wmc_get_link', add_query_arg( $arg, $url ), $k, $currency );
				$links[ $k ] = $link;
			}

		}

		return apply_filters( 'wmc_get_links', $links );
	}

	/**
	 * Get list currencies
	 * @return mixed
	 */
	public function get_list_currencies() {
		if ( ! $this->currencies_list ) {
			$data = array();
			if ( count( $this->params['currency'] ) ) {
				foreach ( $this->params['currency'] as $k => $currency ) {
					if ( ! isset( $this->params['currency_rate_fee'][ $k ] ) ) {
						$this->params['currency_rate_fee'][ $k ] = 0;
					}

					if ( ! isset( $this->params['currency_rate'][ $k ] ) ) {
						$this->params['currency_rate'][ $k ] = 0;
					}

					if ( ! isset( $this->params['currency_rate_fee_type'][ $k ] ) ) {
						$this->params['currency_rate_fee_type'][ $k ] = 'fixed';
					}

					$rate_fee            = $this->params['currency_rate_fee'][ $k ];
					$rate_fee_calculated = $rate_fee && $this->params['currency_rate_fee_type'][ $k ] == 'percentage' ? floatval( $rate_fee ) * floatval( $this->params['currency_rate'][ $k ] ) / 100 : floatval( $rate_fee );

					$data[ $currency ]['rate']         = ! $this->params['currency_rate_fee'][ $k ] ? $this->params['currency_rate'][ $k ] : floatval( $this->params['currency_rate'][ $k ] ) + floatval( $rate_fee_calculated );
					$data[ $currency ]['pos']          = ! empty( $this->params['currency_pos'][ $k ] ) ? $this->params['currency_pos'][ $k ] : '';
					$data[ $currency ]['decimals']     = ! empty( $this->params['currency_decimals'][ $k ] ) ? $this->params['currency_decimals'][ $k ] : '';
					$data[ $currency ]['custom']       = ! empty( $this->params['currency_custom'][ $k ] ) ? $this->params['currency_custom'][ $k ] : '';
					$data[ $currency ]['thousand_sep'] = ! empty( $this->params['currency_thousand_separator'][ $k ] ) ? $this->params['currency_thousand_separator'][ $k ] : '';
					$data[ $currency ]['decimal_sep']  = ! empty( $this->params['currency_decimal_separator'][ $k ] ) ? $this->params['currency_decimal_separator'][ $k ] : '';
					$data[ $currency ]['hide']         = isset( $this->params['currency_hidden'][ $k ] ) ? $this->params['currency_hidden'][ $k ] : 0;
				}
			}
			$this->currencies_list = $data;
		}

		return apply_filters( 'wmc_get_list_currencies', $this->currencies_list );
	}

	/**
	 * Get current currency
	 * @return mixed
	 */
	public function get_current_currency() {
//		if ( ! self::$current_currency || self::$current_currency != $this->getcookie( 'wmc_current_currency' ) ) {
//			/*Check currency*/
//			$selected_currencies    = $this->get_currencies();
//			self::$current_currency = $this->getcookie( 'wmc_current_currency' );
//			if ( ! self::$current_currency || ! in_array( self::$current_currency, $selected_currencies ) ) {
//				self::$current_currency = get_option( 'woocommerce_currency' );
//			}
//		}
		$current_currency    = $this->getcookie( 'wmc_current_currency' );
		$selected_currencies = $this->get_currencies();

		if ( ! in_array( $current_currency, $selected_currencies ) ) {
			$current_currency = get_option( 'woocommerce_currency' );
		}

		return $current_currency;
	}

	public function get_currencies() {
		return apply_filters( 'wmc_get_currencies', $this->params['currency'] );
	}

	/**
	 * Get checkout currency default
	 * @return bool|mixed
	 */
	public function get_checkout_currency_args() {
		$checkout_currency_args = $this->params['checkout_currency_args'];
		if ( empty( $checkout_currency_args ) ) {
			if ( count( $this->params['currency'] ) == 1 ) {
				$checkout_currency_args = $this->params['currency'];
			}
		}

		return apply_filters( 'wmc_get_default_currency_checkout', $checkout_currency_args );
	}

	/**
	 * Check enable multi currency on cart page
	 * @return mixed
	 */
	public function enable_cart_page() {
		return apply_filters( 'wmc_enable_cart_page', $this->params['enable_cart_page'] );
	}

	/**
	 * List shortcodes on widget or content
	 * @return mixed
	 */
	public function get_list_shortcodes() {
		return apply_filters(
			'wmc_get_list_shortcodes', array(
				''                 => esc_html__( 'Default', 'woocommerce-multi-currency' ),
				'plain_horizontal' => esc_html__( 'Plain Horizontal', 'woocommerce-multi-currency' ),
				'plain_vertical'   => esc_html__( 'Plain Vertical', 'woocommerce-multi-currency' ),
				'plain_vertical_2' => esc_html__( 'Listbox currency code', 'woocommerce-multi-currency' ),
				'layout3'          => esc_html__( 'List Flag Horizontal', 'woocommerce-multi-currency' ),
				'layout4'          => esc_html__( 'List Flag Vertical', 'woocommerce-multi-currency' ),
				'layout5'          => esc_html__( 'List Flag + Currency Code', 'woocommerce-multi-currency' ),
				'layout6'          => esc_html__( 'Horizontal Currency Symbols', 'woocommerce-multi-currency' ),
				'layout9'          => esc_html__( 'Horizontal Currency Slide', 'woocommerce-multi-currency' ),
				'layout7'          => esc_html__( 'Vertical Currency Symbols', 'woocommerce-multi-currency' ),
				'layout8'          => esc_html__( 'Vertical Currency Symbols (circle)', 'woocommerce-multi-currency' ),
				'layout10'         => esc_html__( 'Flag + Country + Currency + Symbol', 'woocommerce-multi-currency' ),
				'layout11'         => esc_html__( 'Flag + Currency name + Currency Code', 'woocommerce-multi-currency' ),
			)
		);
	}

	/**
	 * Check fixed price
	 * @return mixed
	 */
	public function check_fixed_price() {
		return apply_filters( 'wmc_check_fixed_price', $this->params['enable_fixed_price'] );
	}

	/**
	 * @param string $language
	 *
	 * @return mixed|void
	 */
	public function get_design_title( $language = '' ) {
		return apply_filters( 'wmc_get_design_title', $this->get_params( 'design_title', $language ) );
	}

	/**
	 * Get Main color
	 * @return mixed
	 */
	public function get_main_color() {
		return apply_filters( 'wmc_get_main_color', $this->params['main_color'] );
	}

	/**
	 * Get Hover color
	 * @return mixed
	 */
	public function get_hover_color() {
		$s_hover_color = $this->params['hover_color'] ? $this->params['hover_color'] : $this->params['main_color'];

		return apply_filters( 'wmc_get_hover_color', $s_hover_color );
	}

	/**
	 * Check design enable
	 * @return mixed
	 */
	public function get_enable_design() {
		if ( $this->params['enable_design'] && $this->params['enable'] ) {
			return apply_filters( 'wmc_get_enable_design', $this->params['enable_design'] );
		} else {
			return false;
		}
	}

	/**
	 * Get design position
	 * @return mixed
	 */
	public function get_design_position() {
		return apply_filters( 'wmc_get_design_position', $this->params['design_position'] );
	}

	/**
	 * Get text color on design
	 * @return mixed
	 */
	public function get_text_color() {
		return apply_filters( 'wmc_text_color', $this->params['text_color'] );
	}

	/**
	 * Get background color of design
	 * @return mixed
	 */
	public function get_background_color() {
		return apply_filters( 'wmc_background_color', $this->params['background_color'] );
	}

	/**
	 * @param string $original_price
	 * @param string $other_price
	 *
	 * @return mixed
	 */
	public function get_exchange( $original_price = '', $other_price = '' ) {
		$rates        = array( $original_price => 1 );
		$data_rates   = array();
		$selected_api = $this->get_finance_api();
		switch ( $selected_api ) {
			case 0:
				$data_rates = $this->get_default_exchange( $original_price, $other_price );
				break;
			case 1:
				$data_rates = $this->get_google_exchange( $original_price, $other_price );
				break;
			case 2:
				$data_rates = $this->get_yahoo_exchange( $original_price, $other_price );
				break;
			case 3:
				$data_rates = $this->get_cuex_exchange( $original_price, $other_price );
				break;
			case 4:
				$data_rates = $this->get_transferwise_exchange( $original_price, $other_price );
				break;
			case 5:
				$data_rates = $this->get_xe_exchange( $original_price, $other_price );
				break;
			case 6:
				$data_rates = $this->get_openexchangerates_exchange( $original_price, $other_price );
				break;
			case 7:
				$data_rates = $this->get_exchangeratesapi_exchange( $original_price, $other_price );
				break;
			case 8:
				$data_rates = $this->get_currencyapi_exchange( $original_price, $other_price );
				break;
			default:
				$data_rates = apply_filters( 'wmc_get_currency_exchange_rates', $data_rates, $original_price, $other_price, $this );
		}

		$list_currencies = $this->get_list_currencies();
		if ( ( is_array( $data_rates ) || $data_rates instanceof Countable ) && count( $data_rates ) ) {
			foreach ( $data_rates as $k => $rate ) {
				if ( $k !== $original_price ) {
					if ( $rate === false ) {
						if ( isset( $list_currencies[ $k ] ) && ! empty( $list_currencies[ $k ]['rate'] ) ) {
							$rates[ $k ] = $list_currencies[ $k ]['rate'];
						} else {
							$rates[ $k ] = 1;
						}
					} else {
						$rates[ $k ] = number_format( round( $rate, $this->get_rate_decimals() ), $this->get_rate_decimals(), '.', '' );
					}
				}
			}
		}

		return apply_filters( 'wmc_get_exchange_rates', $rates, $original_price, $other_price, $this, $selected_api );
	}

	/**
	 * Get API resource
	 * @return mixed
	 */
	public function get_finance_api() {
		return apply_filters( 'wmc_get_finance_api', $this->params['finance_api'] );
	}

	/**
	 * @param $original_price
	 * @param $other_price
	 *
	 * @return array|bool
	 */
	private function get_default_exchange( $original_price, $other_price ) {
		global $wp_version;
		$rates = array();

		if ( $original_price && $other_price ) {
			$url = 'https://api.villatheme.com/wp-json/exchange/v1';

			$request = wp_remote_post(
				$url, array(
					'user-agent' => 'WordPress/' . $wp_version . '; ' . get_site_url(),
					'timeout'    => 10,
					'body'       => array(
						'from' => $original_price,
						'to'   => $other_price
					)
				)
			);
			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
				$rates = json_decode( trim( $request['body'] ), true );
			}
		} else {
			return false;
		}

		return apply_filters( 'wmc_get_exchange', $rates );

	}

	/**
	 * @param $original_price
	 * @param $other_price
	 *
	 * @return array|bool
	 */
	private function get_google_exchange( $original_price, $other_price ) {
		$rates = array();
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}
		foreach ( $other_price as $code ) {
			$rates[ $code ] = false;
			$url            = 'https://www.google.com/async/currency_v2_update?vet=12ahUKEwjfsduxqYXfAhWYOnAKHdr6BnIQ_sIDMAB6BAgFEAE..i&ei=kgAGXN-gDJj1wAPa9ZuQBw&yv=3&async=source_amount:1,source_currency:' . $this->get_country_freebase( $original_price ) . ',target_currency:' . $this->get_country_freebase( $code ) . ',lang:en,country:us,disclaimer_url:https%3A%2F%2Fwww.google.com%2Fintl%2Fen%2Fgooglefinance%2Fdisclaimer%2F,period:5d,interval:1800,_id:knowledge-currency__currency-v2-updatable,_pms:s,_fmt:pc';

			$request = wp_remote_get(
				$url, array(
					'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
					'timeout'    => 10
				)
			);

			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
				preg_match( '/data-exchange-rate=\"(.+?)\"/', $request['body'], $match );
				if ( sizeof( $match ) > 1 && $match[1] ) {
					$rates[ $code ] = $match[1];
				}
			}
		}

		return $rates;
	}

	/**
	 * @param $original_price
	 * @param $other_price
	 *
	 * @return array|bool
	 */
	private function get_yahoo_exchange( $original_price, $other_price ) {
		$rates = array();
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}
		$now = current_time( 'timestamp', true );
		foreach ( $other_price as $code ) {
			$rates[ $code ] = false;
			$url            = 'https://query1.finance.yahoo.com/v8/finance/chart/' . $original_price . $code . '=X?symbol=' . $original_price . $code . '%3DX&period1=' . ( $now - 60 * 86400 ) . '&period2=' . $now . '&interval=1d&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US&corsDomain=finance.yahoo.com';

			$request = wp_remote_get(
				$url, array(
					'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
					'timeout'    => 10
				)
			);

			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
				$data   = json_decode( $request['body'], true );
				$result = isset( $data['chart']['result'][0]['indicators']['quote'][0]['open'] ) ? array_filter( $data['chart']['result'][0]['indicators']['quote'][0]['open'] ) : ( isset( $data['chart']['result'][0]['meta']['previousClose'] ) ? array( $data['chart']['result'][0]['meta']['previousClose'] ) : array() );

				if ( count( $result ) && is_array( $result ) ) {
					$rates[ $code ] = end( $result );
				}
			}
		}

		return $rates;
	}

	/**
	 * @param $original_price
	 * @param $other_price
	 *
	 * @return array|bool
	 */
	private function get_cuex_exchange( $original_price, $other_price ) {
		$rates = array();
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}

		$original_price = strtolower( $original_price );

		foreach ( $other_price as $code ) {
			$lower_code     = strtolower( $code );
			$rates[ $code ] = false;
			$date           = gmdate( 'Y-m-d', current_time( 'timestamp' ) );
			$url            = "https://api.cuex.com/v1/exchanges/{$original_price}?to_currency={$lower_code}&from_date={$date}&l=en";
			$request        = wp_remote_get(
				$url, array(
					'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
					'timeout'    => 10,
					'headers'    => array( 'Authorization' => '3b71e5d431b2331acb65f2d484d423e5' ),
				)
			);

			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
				$body = json_decode( wp_remote_retrieve_body( $request ) );
				if ( isset( $body->data[0]->rate ) ) {
					$rates[ $code ] = $body->data[0]->rate;
				}
			}
		}

		return $rates;
	}

	private function get_transferwise_exchange( $original_price, $other_price ) {
		$rates = array();
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}

//		foreach ( $other_price as $code ) {
//			$rates[ $code ] = false;
//			$url            = "https://wise.com/api/v1/payment/calculate?amount=1&sourceCurrency={$original_price}&targetCurrency={$code}";
//			$request        = wp_remote_get(
//				$url, array(
//					'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
//					'timeout'    => 100,
//					'headers'    => array(
//						'x-authorization-key' => 'dad99d7d8e52c2c8aaf9fda788d8acdc'
//					)
//				)
//			);
//
//			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
//				$body = json_decode( wp_remote_retrieve_body( $request ) );
//				if ( isset( $body->transferwiseRate ) ) {
//					$rates[ $code ] = $body->transferwiseRate;
//				}
//			}
//		}

		foreach ( $other_price as $code ) {
			$rates[ $code ] = false;
			$url            = "https://api.wise.com/v1/rates?source={$original_price}&target={$code}";
//			$url            = "https://api.sandbox.transferwise.tech/v1/rates?source={$original_price}&target={$code}";
			$request = wp_remote_get(
				$url, array(
					'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
					'timeout'    => 100,
					'headers'    => array(
						'Authorization' => 'Bearer ' . $this->params['wise_api_token']
					)
				)
			);

			if ( ! is_wp_error( $request ) || wp_remote_retrieve_response_code( $request ) === 200 ) {
				$body = json_decode( wp_remote_retrieve_body( $request ) );
				if ( is_array( $body ) && isset( $body[0] ) && is_object( $body[0] ) && property_exists( $body[0], 'rate' ) ) {
					$rates[ $code ] = $body[0]->rate;
				}
			}
		}

		return $rates;
	}

	private function get_xe_exchange( $original_price, $other_price ) {
		$final_rates = array();
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}

		$first_code    = current( $other_price );
		$from_Currency = urlencode( $original_price );
		$to_Currency   = urlencode( $first_code );
		//http://www.xe.com/currencyconverter/convert/?Amount=1&From=ZWD&To=CUP
		$url = "http://www.xe.com/currencyconverter/convert/?Amount=1&From=" . $from_Currency . "&To=" . $to_Currency;

		$request = wp_remote_get(
			$url, array(
				'user-agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
				'timeout'    => 100,
			)
		);

		$body = ( wp_remote_retrieve_body( $request ) );

		preg_match( '/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/', $body, $matches );

		$data = json_decode( $matches[1] );
//		$dataManifest = $data->props->pageProps->dataManifest;
		$rates = [];

//		foreach ( $dataManifest as $item ) {
//			if ( empty( $item->rates ) ) {
//				continue;
//			}
//
//			$rates = (array) $item->rates;
//		}
//
//		$base_rate = ! empty( $rates[ $from_Currency ] ) ? $rates[ $from_Currency ] : '';
//
//		if ( ! $base_rate ) {
//			return $final_rates;
//		}

//		foreach ( $other_price as $code ) {
//			$final_rates[ $code ] = ! empty( $rates[ $code ] ) ? $rates[ $code ] / $base_rate : false;
//		}

		$initialRates = $data->props->pageProps->initialRatesData->rates;
		foreach ( $other_price as $code ) {
			if ( property_exists( $initialRates, $from_Currency ) && property_exists( $initialRates, $code ) ) {
				$final_rates[ $code ] = floatval( $initialRates->$code ) / floatval( $initialRates->$from_Currency );
			}
		}

		return $final_rates;
	}

	private function get_openexchangerates_exchange( $base_currency, $other_price ) {
		$rates  = array();
		$app_id = $this->params['openexchangerates_app_id'];
		if ( $other_price ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}

		// Format target currencies
		$symbols = implode( ',', $other_price );

		// Build the request URL
		$url = add_query_arg( array(
			'app_id'  => $app_id,
			'base'    => strtoupper( $base_currency ),
			'symbols' => strtoupper( $symbols ),
		), 'https://openexchangerates.org/api/latest.json' );

		// Make the request
		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {
			return [];
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( isset( $data['error'] ) || empty( $data['rates'] ) ) {
			return [];
		}

		$rates = $data['rates'];

		return $rates;
	}

	function get_exchangeratesapi_exchange( $base_currency, $other_price ) {
		$api_key       = $this->params['exchangeratesapi_key'];
		$base_currency = strtoupper( $base_currency );
		if ( $other_price && ! is_array( $other_price ) ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}
		if ( $base_currency != 'EUR' && ! in_array( $base_currency, $other_price ) ) {
			$other_price[] = $base_currency;
		}
		$symbols = implode( ',', array_map( 'strtoupper', $other_price ) );
		//base always EUR for free plan
		$url = add_query_arg( array(
			'access_key' => $api_key,
			'symbols'    => $symbols
		), 'https://api.exchangeratesapi.io/v1/latest' );

		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {
			//Failed to fetch exchange rates.
			return [];
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( ! isset( $data['rates'] ) ) {
			//Invalid data received from API.
			return [];
		}

		if ( $base_currency == 'EUR' ) {
			return $data['rates'];
		}

		if ( ! isset( $data['rates'][ $base_currency ] ) ) {
			return [];
		}

		$base_rate       = $data['rates'][ $base_currency ];
		$converted_rates = array();

		foreach ( $other_price as $target ) {
			$target = strtoupper( $target );
			if ( isset( $data['rates'][ $target ] ) ) {
				$converted_rates[ $target ] = $data['rates'][ $target ] / $base_rate;
			}
		}

		return $converted_rates;
	}

	function get_currencyapi_exchange( $base_currency, $other_price ) {
		$api_key       = $this->params['currencyapi_key'];
		$supported     = self::get_supported_currencyapi_codes( $api_key );
		$base_currency = strtoupper( $base_currency );

		if ( ! in_array( $base_currency, $supported ) ) {
			//Base currency is not supported.
			return [];
		}

		if ( $other_price && ! is_array( $other_price ) ) {
			$other_price = array_filter( explode( ',', $other_price ) );
		}
		$valid_targets = array_values( array_intersect( array_map( 'strtoupper', $other_price ), $supported ) );
		$symbols       = implode( ',', array_map( 'strtoupper', $other_price ) );

		if ( empty( $valid_targets ) ) {
			//No valid target currencies provided.
			return [];
		}

		$url = add_query_arg( array(
			'apikey'        => $api_key,
			'base_currency' => $base_currency,
			'currencies'    => implode( ',', $valid_targets ),
		), 'https://api.currencyapi.com/v3/latest' );

		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {
			//Failed to retrieve data from CurrencyAPI.
			return [];
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( ! isset( $data['data'] ) || empty( $data['data'] ) ) {
			//Invalid or empty response from CurrencyAPI.
			return [];
		}

		$rates = array();
		foreach ( $other_price as $currency ) {
			$currency = strtoupper( $currency );
			if ( isset( $data['data'][ $currency ]['value'] ) ) {
				$rates[ $currency ] = $data['data'][ $currency ]['value'];
			}
		}

		return $rates;
	}

	function get_ecb_exchange( $base_currency = 'EUR', $other_price = array() ) {
		//limit currency
		$url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'ecb_error', 'Failed to retrieve ECB data.' );
		}

		$body = wp_remote_retrieve_body( $response );

		if ( empty( $body ) ) {
			return new WP_Error( 'ecb_empty', 'Empty response from ECB.' );
		}

		// Load XML
		$xml = simplexml_load_string( $body );

		if ( ! $xml ) {
			return new WP_Error( 'ecb_xml', 'Failed to parse ECB XML.' );
		}

		// Get the Cube with the rates
		$rates = array( 'EUR' => 1.0 ); // Base EUR always = 1
		foreach ( $xml->Cube->Cube->Cube as $rate ) {
			$currency           = (string) $rate['currency'];
			$value              = (float) $rate['rate'];
			$rates[ $currency ] = $value;
		}

		$base_currency = strtoupper( $base_currency );
		$results       = array();

		// Make sure base exists
		if ( ! isset( $rates[ $base_currency ] ) ) {
			return new WP_Error( 'invalid_base', "Base currency '$base_currency' not found." );
		}

		// Calculate rates relative to the base
		foreach ( $other_price as $target ) {
			$target = strtoupper( $target );
			if ( isset( $rates[ $target ] ) ) {
				$results[ $target ] = $rates[ $target ] / $rates[ $base_currency ];
			}
		}

		return $results;
	}

	function get_supported_currencyapi_codes( $api_key ) {
		$url = add_query_arg( 'apikey', $api_key, 'https://api.currencyapi.com/v3/currencies' );

		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {
			return [];
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( ! isset( $data['data'] ) ) {
			return [];
		}

		return array_keys( $data['data'] ); // return list of valid currency codes
	}

	public function get_country_freebase( $country_code ) {
		$countries = array(
			"AED" => "/m/02zl8q",
			"AFN" => "/m/019vxc",
			"ALL" => "/m/01n64b",
			"AMD" => "/m/033xr3",
			"ANG" => "/m/08njbf",
			"AOA" => "/m/03c7mb",
			"ARS" => "/m/024nzm",
			"AUD" => "/m/0kz1h",
			"AWG" => "/m/08s1k3",
			"AZN" => "/m/04bq4y",
			"BAM" => "/m/02lnq3",
			"BBD" => "/m/05hy7p",
			"BDT" => "/m/02gsv3",
			"BGN" => "/m/01nmfw",
			"BHD" => "/m/04wd20",
			"BIF" => "/m/05jc3y",
			"BMD" => "/m/04xb8t",
			"BND" => "/m/021x2r",
			"BOB" => "/m/04tkg7",
			"BRL" => "/m/03385m",
			"BSD" => "/m/01l6dm",
			"BTC" => "/m/05p0rrx",
			"BWP" => "/m/02nksv",
			"BYN" => "/m/05c9_x",
			"BZD" => "/m/02bwg4",
			"CAD" => "/m/0ptk_",
			"CDF" => "/m/04h1d6",
			"CHF" => "/m/01_h4b",
			"CLP" => "/m/0172zs",
			"CNY" => "/m/0hn4_",
			"COP" => "/m/034sw6",
			"CRC" => "/m/04wccn",
			"CUC" => "/m/049p2z",
			"CUP" => "/m/049p2z",
			"CVE" => "/m/06plyy",
			"CZK" => "/m/04rpc3",
			"DJF" => "/m/05yxn7",
			"DKK" => "/m/01j9nc",
			"DOP" => "/m/04lt7_",
			"DZD" => "/m/04wcz0",
			"EGP" => "/m/04phzg",
			"ETB" => "/m/02_mbk",
			"EUR" => "/m/02l6h",
			"FJD" => "/m/04xbp1",
			"GBP" => "/m/01nv4h",
			"GEL" => "/m/03nh77",
			"GHS" => "/m/01s733",
			"GMD" => "/m/04wctd",
			"GNF" => "/m/05yxld",
			"GTQ" => "/m/01crby",
			"GYD" => "/m/059mfk",
			"HKD" => "/m/02nb4kq",
			"HNL" => "/m/04krzv",
			"HRK" => "/m/02z8jt",
			"HTG" => "/m/04xrp0",
			"HUF" => "/m/01hfll",
			"IDR" => "/m/0203sy",
			"ILS" => "/m/01jcw8",
			"INR" => "/m/02gsvk",
			"IQD" => "/m/01kpb3",
			"IRR" => "/m/034n11",
			"ISK" => "/m/012nk9",
			"JMD" => "/m/04xc2m",
			"JOD" => "/m/028qvh",
			"JPY" => "/m/088n7",
			"KES" => "/m/05yxpb",
			"KGS" => "/m/04k5c6",
			"KHR" => "/m/03_m0v",
			"KMF" => "/m/05yxq3",
			"KRW" => "/m/01rn1k",
			"KWD" => "/m/01j2v3",
			"KYD" => "/m/04xbgl",
			"KZT" => "/m/01km4c",
			"LAK" => "/m/04k4j1",
			"LBP" => "/m/025tsrc",
			"LKR" => "/m/02gsxw",
			"LRD" => "/m/05g359",
			"LSL" => "/m/04xm1m",
			"LYD" => "/m/024xpm",
			"MAD" => "/m/06qsj1",
			"MDL" => "/m/02z6sq",
			"MGA" => "/m/04hx_7",
			"MKD" => "/m/022dkb",
			"MMK" => "/m/04r7gc",
			"MOP" => "/m/02fbly",
			"MRO" => "/m/023c2n",
			"MUR" => "/m/02scxb",
			"MVR" => "/m/02gsxf",
			"MWK" => "/m/0fr4w",
			"MXN" => "/m/012ts8",
			"MYR" => "/m/01_c9q",
			"MZN" => "/m/05yxqw",
			"NAD" => "/m/01y8jz",
			"NGN" => "/m/018cg3",
			"NIO" => "/m/02fvtk",
			"NOK" => "/m/0h5dw",
			"NPR" => "/m/02f4f4",
			"NZD" => "/m/015f1d",
			"OMR" => "/m/04_66x",
			"PAB" => "/m/0200cp",
			"PEN" => "/m/0b423v",
			"PGK" => "/m/04xblj",
			"PHP" => "/m/01h5bw",
			"PKR" => "/m/02svsf",
			"PLN" => "/m/0glfp",
			"PYG" => "/m/04w7dd",
			"QAR" => "/m/05lf7w",
			"RON" => "/m/02zsyq",
			"RSD" => "/m/02kz6b",
			"RUB" => "/m/01hy_q",
			"RWF" => "/m/05yxkm",
			"SAR" => "/m/02d1cm",
			"SBD" => "/m/05jpx1",
			"SCR" => "/m/01lvjz",
			"SDG" => "/m/08d4zw",
			"SEK" => "/m/0485n",
			"SGD" => "/m/02f32g",
			"SLL" => "/m/02vqvn",
			"SOS" => "/m/05yxgz",
			"SRD" => "/m/02dl9v",
			"SSP" => "/m/08d4zw",
			"STD" => "/m/06xywz",
			"SZL" => "/m/02pmxj",
			"THB" => "/m/0mcb5",
			"TJS" => "/m/0370bp",
			"TMT" => "/m/0425kx",
			"TND" => "/m/04z4ml",
			"TOP" => "/m/040qbv",
			"TRY" => "/m/04dq0w",
			"TTD" => "/m/04xcgz",
			"TWD" => "/m/01t0lt",
			"TZS" => "/m/04s1qh",
			"UAH" => "/m/035qkb",
			"UGX" => "/m/04b6vh",
			"USD" => "/m/09nqf",
			"UYU" => "/m/04wblx",
			"UZS" => "/m/04l7bl",
			"VEF" => "/m/021y_m",
			"VND" => "/m/03ksl6",
			"XAF" => "/m/025sw2b",
			"XCD" => "/m/02r4k",
			"XOF" => "/m/025sw2q",
			"XPF" => "/m/01qyjx",
			"YER" => "/m/05yxwz",
			"ZAR" => "/m/01rmbs",
			"ZMW" => "/m/0fr4f",
		);
		$data      = '';
		if ( $country_code && isset( $countries[ $country_code ] ) ) {
			$data = $countries[ $country_code ];
		}

		return $data;
	}

	/**
	 * Get custom CSS
	 * @return mixed
	 */
	public function get_rate_decimals() {
		return (int) apply_filters( 'wmc_get_rate_decimals', $this->params['rate_decimals'] );
	}

	/**Set currency in Cookie
	 *
	 * @param $currency_code
	 * @param bool $checkout
	 */
	public function set_current_currency( $currency_code, $checkout = true ) {
		if ( ! empty( $_SERVER['HTTP_ACCEPT'] ) ) {
			if ( strpos( $_SERVER['HTTP_ACCEPT'], 'text/css' ) !== false ) {
				return;
			}
		}

		if ( $currency_code ) {
			$this->setcookie( 'wmc_current_currency', $currency_code, time() + 60 * 60 * 24, '/' );
			if ( $this->get_checkout_currency() && $this->get_enable_multi_payment() && $checkout ) {
				$this->setcookie( 'wmc_current_currency_old', $currency_code, time() + 60 * 60 * 24, '/' );
			} elseif ( ! $this->get_enable_multi_payment() && $checkout ) {
				$this->setcookie( 'wmc_current_currency_old', $currency_code, time() + 60 * 60 * 24, '/' );
			}
		}
	}

	/**
	 * Check Conditional tag
	 * @return mixed
	 */
	public function get_checkout_currency() {
		return apply_filters( 'wmc_get_checkout_currency', $this->params['checkout_currency'] );
	}

	/**
	 * Check enable pay with multi currencies
	 * @return mixed
	 */
	public function get_enable_multi_payment() {
		return apply_filters( 'wmc_get_enable_multi_payment', $this->params['enable_multi_payment'] );

	}

	/**Get currency by country with WPML.org
	 *
	 * @param $language_slug
	 *
	 * @return array|mixed
	 */
	public function get_wpml_currency_by_language( $language_slug ) {

		if ( $language_slug ) {
			if ( isset( $this->params[ $language_slug . '_wpml_by_language' ] ) ) {
				$currency_code = $this->params[ $language_slug . '_wpml_by_language' ];
			} else {
				return array();
			}

			return apply_filters( 'wmc_get_currency_wpml_by_language' . $language_slug, $currency_code );
		} else {
			return array();
		}
	}

	/**Get currency by language
	 *
	 * @param $language_slug
	 *
	 * @return array|mixed
	 */
	public function get_currency_by_language( $language_slug ) {

		if ( $language_slug ) {
			if ( isset( $this->params[ $language_slug . '_by_language' ] ) ) {
				$currency_code = $this->params[ $language_slug . '_by_language' ];
			} else {
				return array();
			}

			return apply_filters( 'wmc_get_currency_by_language_' . $language_slug, $currency_code );
		} else {
			return array();
		}
	}

	/**
	 * @param $currency_code
	 *
	 * @return array|mixed
	 */
	public function get_currency_by_countries( $currency_code ) {

		if ( $currency_code ) {
			if ( isset( $this->params[ $currency_code . '_by_country' ] ) ) {
				$countries_code = $this->params[ $currency_code . '_by_country' ];
			} else {
				return array();
			}

			return apply_filters( 'wmc_get_currency_by_countries_' . $currency_code, $countries_code );
		} else {
			return array();
		}
	}

	/**
	 * @param $country_code
	 *
	 * @return string
	 */
	public function get_currency_by_detect_country( $country_code ) {
		$list_currencies = $this->get_currencies();
		foreach ( $list_currencies as $currency ) {
			if ( ! empty( $this->params[ $currency . '_by_country' ] ) && is_array( $this->params[ $currency . '_by_country' ] ) ) {
				if ( in_array( $country_code, $this->params[ $currency . '_by_country' ] ) ) {
					return $currency;
				}
			}
		}

		return '';
	}

	/**Get payments available by currency code.
	 *
	 * @param $currency_code
	 *
	 * @return array|mixed
	 */
	public function get_payments_by_currency( $currency_code ) {

		if ( $currency_code ) {
			if ( isset( $this->params[ 'currency_payment_method_' . $currency_code ] ) ) {
				$payments = $this->params[ 'currency_payment_method_' . $currency_code ];
			} else {
				return array();
			}

			return apply_filters( 'wmc_get_payments_by_currency_' . $currency_code, $payments );
		} else {
			return array();
		}
	}

	/**
	 * Get exchange rate
	 * @return mixed
	 */
	public function get_update_exchange_rate() {
		return apply_filters( 'wmc_get_update_exchange_rate', $this->params['update_exchange_rate'] );

	}

	/**
	 * Get Purchased code
	 * @return mixed
	 */
	public function get_key() {
		return apply_filters( 'wmc_get_key', $this->params['key'] );

	}

	/**
	 * Check enable currency by country
	 * @return mixed
	 */
	public function get_enable_currency_by_country() {
		return apply_filters( 'wmc_get_enable_currency_by_country', $this->params['enable_currency_by_country'] );

	}

	/**
	 * Get type of auto detect
	 * @return mixed
	 */
	public function get_auto_detect() {
		return apply_filters( 'wmc_get_auto_detect', $this->params['auto_detect'] );

	}

	/**
	 * Check Enable plugin
	 * @return mixed
	 */
	public function get_enable() {

		return apply_filters( 'wmc_get_enable', $this->params['enable'] );
	}

	/**
	 * Get currency default
	 * @return mixed
	 */
	public function get_default_currency() {
		return apply_filters( 'wmc_get_default_currency', $this->params['currency_default'] );
	}

	/**
	 * @param $param
	 *
	 * @return string
	 */
	public function get_param( $param ) {
		return isset( $this->params[ $param ] ) ? $this->params[ $param ] : '';
	}

	public function get_price( $product ) {
		$pid = $product->get_id();
		if ( $this->check_fixed_price() ) {

		}

		return '';
	}

	/**
	 * @return bool
	 */
	public static function is_request_to_rest_api() {
		if ( empty( $_SERVER['REQUEST_URI'] ) ) {
			return false;
		}

		$rest_prefix = '/' . untrailingslashit( rest_get_url_prefix() ) . '/';
		$request_uri = esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) );

		return false !== strpos( $request_uri, $rest_prefix );
	}

	public function get_params( $name = "", $language = '' ) {
		if ( ! $name ) {
			return $this->params;
		} elseif ( isset( $this->params[ $name ] ) ) {
			if ( $language ) {
				$name_language = $name . '_' . $language;
				if ( isset( $this->params[ $name_language ] ) ) {
					return apply_filters( 'woocommerce_multi_currency_params-' . $name_language, $this->params[ $name_language ] );
				} else {
					return apply_filters( 'woocommerce_multi_currency_params-' . $name_language, $this->params[ $name ] );
				}
			} else {
				return apply_filters( 'woocommerce_multi_currency_params-' . $name, $this->params[ $name ] );
			}
		} else {
			return false;
		}
	}

	/**
	 * @param $price
	 * @param array $args
	 *
	 * @return float
	 */
	public static function convert_price_to_float( $price, $args = array() ) {
		$args           = apply_filters(
			'wc_price_args',
			wp_parse_args(
				$args,
				array(
					'ex_tax_label'       => false,
					'currency'           => '',
					'decimal_separator'  => wc_get_price_decimal_separator(),
					'thousand_separator' => wc_get_price_thousand_separator(),
					'decimals'           => wc_get_price_decimals(),
					'price_format'       => get_woocommerce_price_format(),
				)
			)
		);
		$original_price = $price;
		$negative       = $price < 0;
		$price          = apply_filters( 'raw_woocommerce_price', floatval( $negative ? $price * - 1 : $price ), $original_price );
		$price          = apply_filters( 'formatted_woocommerce_price', number_format( $price, $args['decimals'], $args['decimal_separator'], $args['thousand_separator'] ), $price, $args['decimals'], $args['decimal_separator'], $args['thousand_separator'] );

		return floatval( str_replace( array( $args['thousand_separator'], $args['decimal_separator'] ), array(
			'',
			'.'
		), $price ) );
	}

	public static function get_price_format( $pos ) {
		switch ( $pos ) {
			case 'left' :
				$format = '%1$s%2$s';
				break;
			case 'right' :
				$format = '%2$s%1$s';
				break;
			case 'left_space' :
				$format = '%1$s&nbsp;%2$s';
				break;
			case 'right_space' :
			default:
				$format = '%2$s&nbsp;%1$s';
				break;
		}

		return $format;
	}

	/**
	 *
	 */
	public function set_fallback_currency() {
		$default_currency = $this->get_default_currency();
		$list_currencies  = $this->get_list_currencies();
		if ( $list_currencies[ $default_currency ]['hide'] !== '1' ) {
			$this->set_current_currency( $default_currency );
		} else {
			$need_set_default = true;
			foreach ( $list_currencies as $currency_code => $currency_data ) {
				if ( $currency_data['hide'] !== '1' ) {
					$this->set_current_currency( $currency_code );
					$need_set_default = false;
					break;
				}
			}
			if ( $need_set_default ) {
				$this->set_current_currency( $default_currency );
			}
		}
	}

	public static function country_code_key_from_headers() {
		return apply_filters( 'wmc_country_code_from_headers', array(
			'HTTP_GEOIP_COUNTRY_CODE',
			'GEOIP_COUNTRY_CODE',
			'HTTP_CF_IPCOUNTRY',
			'MM_COUNTRY_CODE',
			'HTTP_X_COUNTRY_CODE',
			'HTTP_X_QC_COUNTRY',
		) );
	}

	public static function wp_kses_post( $content ) {
		if ( self::$allow_html === null ) {
			self::$allow_html = wp_kses_allowed_html( 'post' );
			self::$allow_html = array_merge_recursive( self::$allow_html, array(
					'input'  => array(
						'type'         => 1,
						'id'           => 1,
						'name'         => 1,
						'class'        => 1,
						'placeholder'  => 1,
						'autocomplete' => 1,
						'style'        => 1,
						'value'        => 1,
						'size'         => 1,
						'checked'      => 1,
						'disabled'     => 1,
						'readonly'     => 1,
						'data-*'       => 1,
					),
					'form'   => array(
						'method' => 1,
						'id'     => 1,
						'class'  => 1,
						'action' => 1,
						'data-*' => 1,
					),
					'select' => array(
						'id'       => 1,
						'name'     => 1,
						'class'    => 1,
						'multiple' => 1,
						'onchange' => 1,
						'style'    => 1,
						'data-*'   => 1,
					),
					'option' => array(
						'value'    => 1,
						'selected' => 1,
						'data-*'   => 1,
					),
				)
			);
			foreach ( self::$allow_html as $key => $value ) {
				if ( $key === 'input' ) {
					self::$allow_html[ $key ]['data-*']   = 1;
					self::$allow_html[ $key ]['checked']  = 1;
					self::$allow_html[ $key ]['disabled'] = 1;
					self::$allow_html[ $key ]['readonly'] = 1;
				} elseif ( in_array( $key, array( 'div', 'span', 'a', 'form', 'select', 'option', 'tr', 'td' ) ) ) {
					self::$allow_html[ $key ]['data-*'] = 1;
				}
			}
		}
		add_filter( 'safe_style_css', array( __CLASS__, 'safe_style_css' ) );
		add_filter( 'safecss_filter_attr_allow_css', array( __CLASS__, 'safecss_filter_attr_allow_css' ), 10, 2 );
		$content = wp_kses( $content, self::$allow_html );
		remove_filter( 'safe_style_css', array( __CLASS__, 'safe_style_css' ) );
		remove_filter( 'safecss_filter_attr_allow_css', array( __CLASS__, 'safecss_filter_attr_allow_css' ) );

		return $content;
	}

	public static function safecss_filter_attr_allow_css( $allow_css, $css_test_string ) {
		if ( $css_test_string ) {
			if ( explode( ':', $css_test_string )[0] === 'transform' ) {
				$allow_css = true;
			}
		}

		return $allow_css;
	}

	public static function safe_style_css( $css ) {
		$css[] = 'transform';

		return $css;
	}
}