<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Loyalty_Points_Rewards
 * Plugin: WooCommerce Loyalty Points and Rewards
 * Author: Flycart
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Loyalty_Points_Rewards {
	protected $settings;

	public function __construct() {
		if ( ! is_plugin_active( 'loyalty-points-rewards/wp-loyalty-points-rewards.php' ) ) {
			return;
		}
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter('wlpr_convert_to_current_currency', array( $this, 'wlpr_convert_to_current_currency') );
			add_filter('wlpr_discount_price_change_to_original', array( $this, 'wlpr_discount_price_change_to_original') );
		}
	}

	public function wlpr_convert_to_current_currency( $discountApplied ) {
		if ( is_numeric( $discountApplied ) ) {
			return wmc_get_price( $discountApplied );
		}

		return $discountApplied;
	}

	public function wlpr_discount_price_change_to_original( $discountApplied ) {
		if ( is_numeric( $discountApplied ) ) {
			return wmc_revert_price( $discountApplied );
		}

		return $discountApplied;
	}

}