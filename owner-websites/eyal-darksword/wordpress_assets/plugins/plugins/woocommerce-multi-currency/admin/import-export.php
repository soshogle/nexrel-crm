<?php
/**
 * Class WOOMULTI_CURRENCY_Admin_Import_Export
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Admin_Import_Export {
	protected $settings;

	public function __construct() {
		/*This is a custom work plugin which has the same functionality so do not run if that plugin is active*/
		if ( ! is_plugin_active( 'wmc-fixed-price-csv/wmc-fixed-price-csv.php' ) ) {
			add_action( 'plugins_loaded', array( $this, 'plugins_loaded' ), 99 );
		}
	}

	public function plugins_loaded() {
		WOOMULTI_CURRENCY_Exim_General::instance();
		WOOMULTI_CURRENCY_Exim_Export_CSV::instance();
		WOOMULTI_CURRENCY_Exim_Import_CSV::instance();
	}
}