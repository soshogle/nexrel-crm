<?php
/**
 * Plugin Name: reCaptcha for WooCommerce
 * Plugin URI: https://wordpress.org/plugins/woo-recpatcha
 * Description: Protect your eCommerce site with google recptcha.
 * Version: 2.71
 * Author: I Thirteen Web Solution
 * Author URI: https://www.i13websolution.com
 * WC requires at least: 3.2
 * WC tested up to: 10.5
 * Text Domain:recaptcha-for-woocommerce
 * Domain Path: languages/
 * Woo: 5347485:aeae74683dd892d43ed390cc28533524
 */
defined( 'ABSPATH' ) || exit();

class I13_Woo_Recpatcha {

		public $provider;
		public $provider_instance;

	public function __construct() {

		  // Load selected provider from DB (Woo Settings)
				 //$this->provider = get_option( 'i13_captcha_provider', 'google' );
								 $this->provider = $this->normalize_captcha_provider();
		
		add_filter( 'woocommerce_get_settings_pages', array( $this, 'i13_woocomm_load_custom_settings_tab' ) );
				add_action( 'before_woocommerce_init', array( $this, 'declare_compibility' ) );
		add_action( 'plugins_loaded', array( $this, 'i13_woo_load_lang_for_woo_recaptcha' ) );
				
				
				 // Dynamically load provider class
				$this->load_provider_class();

			  
	}
	
	private function normalize_captcha_provider() {

		$provider = get_option( 'i13_captcha_provider' );

		if ( empty( $provider ) || ! is_string( $provider ) ) {
			$provider = 'google';
			update_option( 'i13_captcha_provider', 'google' );
		}

		return strtolower( trim( $provider ) );
	}
		
	public function load_provider_class() {

		  $providers = array(
				'google'     => 'google-recaptcha.php',
				/*'hcaptcha'   => 'hcaptcha-recaptcha.php',*/
				'turnstile'  => 'turnstile-recaptcha.php',
			);
			  
			  

		  if ( isset( $providers[$this->provider] ) ) {

				require_once plugin_dir_path(__FILE__) . $providers[$this->provider];

				 $class = 'I13_Woo_' . ucfirst($this->provider) . '_Recpatcha';

			  if ( class_exists($class) ) {
				  $this->provider_instance = new $class();
			  }
		  }
		  
	}
	
	public function declare_compibility() {

		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
	public function i13_woocomm_load_custom_settings_tab( $settings ) {

			  
				$settings[] = include plugin_dir_path( __FILE__ ) . 'includes/Settings.php';
		return $settings;
	}

	public function i13_woo_load_lang_for_woo_recaptcha() {

		load_plugin_textdomain( 'recaptcha-for-woocommerce', false, basename( dirname( __FILE__ ) ) . '/languages/' );
		
				
	}
	
	

	
}

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function i13_woo_recaptcha_is_rest() {

	  $i13_recapcha_block = sanitize_text_field(wp_unslash(get_option('i13_recapcha_block')));
	if ('yes'==$i13_recapcha_block) {
		return false;
	}
	
	if (isset($_SERVER['REQUEST_URI']) && false !== strpos(sanitize_text_field($_SERVER['REQUEST_URI']), '/wp-json/') && false !== strpos(sanitize_text_field($_SERVER['REQUEST_URI']), '/wp-json/wp/v2/block')) {
		return true;
	}

	return false;
}

function i13_woo_get_user_browser() {
	
	if (!isset($_SERVER['HTTP_USER_AGENT'])) {
	  
		return '';
	}  
  $ub='';
  $u_agent = sanitize_text_field( $_SERVER['HTTP_USER_AGENT'] );
  
  // Next get the name of the useragent yes seperately and for good reason
	if (preg_match('/MSIE/i', $u_agent) && !preg_match('/Opera/i', $u_agent)) {
	  $bname = 'Internet Explorer';
	  $ub = 'MSIE';
	} elseif (preg_match('/Firefox/i', $u_agent)) {
	  $bname = 'Mozilla Firefox';
	  $ub = 'Firefox';
	} elseif (preg_match('/Chrome/i', $u_agent)) {
	  $bname = 'Google Chrome';
	  $ub = 'Chrome';
	} elseif (preg_match('/Safari/i', $u_agent)) {
	  $bname = 'Apple Safari';
	  $ub = 'Safari';
	} elseif (preg_match('/Opera/i', $u_agent)) {
	  $bname = 'Opera';
	  $ub = 'Opera';
	} elseif (preg_match('/Netscape/i', $u_agent)) {
	  $bname = 'Netscape';
	  $ub = 'Netscape';
	}

 return $ub;
 
}

function i13_woo_get_user_ip_address() {

	$client_main = isset( $_SERVER['HTTP_X_REAL_IP'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_REAL_IP'] ) ) : '';
	$client = isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) : '';
	$forward = isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) : '';
	$a = isset( $_SERVER['HTTP_X_FORWARDED'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED'] ) ) : '';
	$b = isset( $_SERVER['HTTP_FORWARDED_FOR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_FORWARDED_FOR'] ) ) : '';
	$c = isset( $_SERVER['HTTP_FORWARDED'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_FORWARDED'] ) ) : '';
	$d = isset( $_SERVER['HTTP_CLIENT_IP'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_CLIENT_IP'] ) ) : '';
	$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

	if ( filter_var( $client_main, FILTER_VALIDATE_IP ) ) {
		$ip = $client_main;
	} else if ( filter_var( $client, FILTER_VALIDATE_IP ) ) {
		$ip = $client;
	} elseif ( filter_var( $forward, FILTER_VALIDATE_IP ) ) {
		$ip = $forward;
	} elseif ( filter_var( $a, FILTER_VALIDATE_IP ) ) {
		$ip = $a;
	} elseif ( filter_var( $b, FILTER_VALIDATE_IP ) ) {
		$ip = $b;
	} elseif ( filter_var( $c, FILTER_VALIDATE_IP ) ) {
		$ip = $c;
	} elseif ( filter_var( $remote, FILTER_VALIDATE_IP ) ) {
		$ip = $remote;
	} else {
		$ip = '';
	}

	return $ip;
}

function i13_woo_ip_in_range( $ip, $startIP, $endIP ) {

	if ( inet_pton( $ip ) >= inet_pton( $startIP ) && inet_pton( $ip ) <= inet_pton( $endIP ) ) {

		return true;
	}

	return false;
}

$active_plugins = (array) apply_filters( 'active_plugins', get_option( 'active_plugins', array() ) );

if ( function_exists( 'is_multisite' ) && is_multisite() ) {
	$active_plugins = array_merge( $active_plugins, apply_filters( 'active_plugins', get_site_option( 'active_sitewide_plugins', array() ) ) );
}

if ( in_array( 'woocommerce/woocommerce.php', $active_plugins ) || array_key_exists( 'woocommerce/woocommerce.php', $active_plugins ) ) {

	$userip = i13_woo_get_user_ip_address();
	$ips = sanitize_text_field( wp_unslash( get_option( 'i13_recapcha_ip_to_skip_captcha' ) ) );
	$in_ip = false;
	if ( trim( $ips ) != '' ) {

		$ipsArr = explode( ',', $ips );

		foreach ( $ipsArr as $ip ) {

			if ( strpos( $ip, '-' ) !== false ) {

				$ipArr = explode( '-', $ip );
				$ip0 = isset( $ipArr[0] ) ? $ipArr[0] : '';
				$ip1 = isset( $ipArr[1] ) ? $ipArr[1] : '';
				if ( i13_woo_ip_in_range( $userip, $ip0, $ip1 ) ) {

					$in_ip = true;
					break;
				}
			} else {

				if ( i13_woo_ip_in_range( $userip, $ip, $ip ) ) {

					$in_ip = true;
					break;
				}
			}
		}
	}
	if ( ! i13_woo_recaptcha_is_rest() && ! $in_ip ) {

		global $i13_woo_recpatcha;
		$i13_woo_recpatcha = new I13_Woo_Recpatcha();
	} else if ( is_admin() ) {

		global $i13_woo_recpatcha;
		$i13_woo_recpatcha = new I13_Woo_Recpatcha();
	}
}
