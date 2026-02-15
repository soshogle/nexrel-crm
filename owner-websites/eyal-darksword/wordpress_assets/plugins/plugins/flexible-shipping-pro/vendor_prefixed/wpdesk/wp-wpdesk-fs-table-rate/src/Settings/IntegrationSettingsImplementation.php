<?php

/**
 * Class IntegrationSettingsImplementation
 * @package WPDesk\FS\TableRate\Settings
 */
namespace FSProVendor\WPDesk\FS\TableRate\Settings;

use FSProVendor\WPDesk\FS\TableRate\Logger\CanFormatForLog;
/**
 * Integration settings implementation.
 */
class IntegrationSettingsImplementation implements \FSProVendor\WPDesk\FS\TableRate\Settings\IntegrationSettings, \FSProVendor\WPDesk\FS\TableRate\Logger\CanFormatForLog
{
    /**
     * @var string
     */
    private $name;
    /**
     * IntegrationSettingsImplementation constructor.
     *
     * @param string $name
     */
    public function __construct($name)
    {
        $this->name = $name;
    }
    /**
     * @return string
     */
    public function get_name()
    {
        return $this->name;
    }
    /**
     * @return string
     */
    public function format_for_log()
    {
        $integrations_options = \apply_filters('flexible_shipping_integration_options', array('' => \__('None', 'flexible-shipping')));
        return \sprintf(\__('Integration: %1$s', 'flexible-shipping-pro'), isset($integrations_options[$this->name]) ? $integrations_options[$this->name] : $this->name) . "\n";
    }
}
