<?php

/**
 * Class CartCalculationOptions
 *
 * @package WPDesk\FS\TableRate\Settings
 */
namespace FSProVendor\WPDesk\FS\TableRate\Settings;

use FSProVendor\WPDesk\FS\TableRate\AbstractOptions;
/**
 * Can provide cart calculation options.
 */
class CartCalculationOptions extends \FSProVendor\WPDesk\FS\TableRate\AbstractOptions
{
    const CART = 'cart';
    const PACKAGE = 'package';
    /**
     * @return array
     */
    public function get_options()
    {
        return array(self::CART => \__('Cart value', 'flexible-shipping-pro'), self::PACKAGE => \__('Package value', 'flexible-shipping-pro'));
    }
}
