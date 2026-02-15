<?php
/**
 * Class FreeShippingAllowed
 *
 * @package WPDesk\FSPro\TableRate\FreeShipping
 */

namespace WPDesk\FSPro\TableRate\FreeShipping;

use WPDesk\FSPro\TableRate\Settings\ProMethodSettingsFactory;
use WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can determine if free shipping notice is allowed.
 */
class FreeShippingNoticeAllowed implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/shipping-method/free-shipping-notice-allowed', array( $this, 'is_free_shipping_notice_allowed' ), 10, 2 );
	}

	/**
	 * @param bool  $notice_allowed .
	 * @param array $flexible_shipping_method_settings_array .
	 *
	 * @return bool
	 *
	 * @internal
	 */
	public function is_free_shipping_notice_allowed( $notice_allowed, $flexible_shipping_method_settings_array ) {
		$flexible_shipping_method_settings = ProMethodSettingsFactory::create_from_array( $flexible_shipping_method_settings_array );
		if ( ! in_array(
			$flexible_shipping_method_settings->get_free_shipping_requires(),
			array( FreeShippingRequiresOptions::ORDER_AMOUNT, FreeShippingRequiresOptions::ORDER_AMOUNT_OR_COUPON ),
			true
		) ) {
			$notice_allowed = false;
		}
		return $notice_allowed;
	}

}
