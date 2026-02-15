<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_WPML
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_WPML {
	protected $settings;

	public function __construct() {
		if (  is_plugin_active( 'sitepress-multilingual-cms/sitepress.php' ) ) {
			$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
			if ( $this->settings->get_enable() ) {
				add_action( 'init', array( $this, 'init' ), 99 );
			}
		}
	}

	/**
	 *
	 */
	public function init() {

		if ( $this->settings->enable_wpml() ) {
			$current_lang     = wpml_get_current_language();
			$current_currency = $this->settings->get_current_currency();
			$depend_currency  = $this->settings->get_wpml_currency_by_language( $current_lang );
			$check_lang       = $this->settings->getcookie( 'wmc_wpml_lang' );
			if ( $check_lang != $current_lang ) {
				$this->settings->setcookie( 'wmc_wpml_lang', $current_lang, time() + 86400 );
				if ( $depend_currency != $current_currency ) {
					$this->settings->set_current_currency( $depend_currency );
				}
			}
		}

	}
}