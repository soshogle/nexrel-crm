<?php

namespace FSProVendor;

class WPDesk_Tracker_Factory_Prefixedu {

	private $logo_url = 'assets/images/logo-fs.svg';

	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_reminder_script' ) );
		add_action( 'admin_footer', array( $this, 'display_html_element' ) );
	}

	public function enqueue_reminder_script() {
		if ( $this->should_display() ) {
			wp_enqueue_script(
				'wpdesk-activation-reminder',
				plugins_url( 'flexible-shipping-pro/vendor_prefixed/wpdesk/wp-wpdesk-tracker/src/popup.js' ),
				array(),
				'313',
				true
			);

			wp_enqueue_style(
				'wpdesk-activation-reminder',
				plugins_url( 'flexible-shipping-pro/vendor_prefixed/wpdesk/wp-wpdesk-tracker/src/popup.css' ),
				array(),
				'313'
			);
		}
	}

	public function display_html_element() {
		if ( $this->should_display() ) {
			$logo_url          = plugins_url( 'flexible-shipping-pro' . '/' . $this->logo_url );
			$cookie_name       = md5( site_url() . 'flexible-shipping-pro' );
			$subscriptions_url = admin_url( 'admin.php?page=wpdesk-licenses' );
			$read_more_url     = 'https://flexibleshipping.com';
			echo "<span class=\"wpdesk-activation-reminder\" data-plugin_title=\"Flexible Shipping PRO\" data-plugin_dir=\"flexible-shipping-pro\" data-logo_url=\"$logo_url\" data-cookie_name=\"$cookie_name\" data-subscriptions_url=\"$subscriptions_url\" data-buy_plugin_url=\"https://octol.io/fs-license-popup\" data-read_more_url=\"$read_more_url\" data-how_to_activate_link=\"https://octol.io/fs-license-docs\"></span>";
		}
	}

	private function should_display() {
		return get_locale() !== 'pl_PL' && ! $this->is_plugin_activated();
	}

	private function is_plugin_activated() {
		return get_option( 'api_flexible-shipping-pro_activated', '' ) === 'Activated';
	}

}

if ( defined( 'ABSPATH' ) ) {
	new WPDesk_Tracker_Factory_Prefixedu();
}
