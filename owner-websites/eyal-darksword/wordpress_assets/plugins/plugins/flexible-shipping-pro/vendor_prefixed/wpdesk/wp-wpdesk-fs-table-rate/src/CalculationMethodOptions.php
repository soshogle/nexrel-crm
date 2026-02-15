<?php

/**
 * Class CartCalculationOptions
 *
 * @package WPDesk\FSPro\TableRate
 */
namespace FSProVendor\WPDesk\FS\TableRate;

/**
 * Can provide calculation method options.
 */
class CalculationMethodOptions extends \FSProVendor\WPDesk\FS\TableRate\AbstractOptions
{
    /**
     * @return array
     */
    public function get_options()
    {
        return array('sum' => \__('Sum', 'flexible-shipping-pro'));
    }
}
