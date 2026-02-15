<?php

namespace FSProVendor\Octolize\ShippingExtensions\Tracker;

use Exception;
use FSProVendor\Octolize\ShippingExtensions\Tracker\DataProvider\ShippingExtensionsDataProvider;
use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use FSProVendor\WPDesk_Tracker;
/**
 * .
 */
class Tracker implements \FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable
{
    /**
     * @var ViewPageTracker
     */
    private $tracker;
    /**
     * @param ViewPageTracker $tracker
     */
    public function __construct(\FSProVendor\Octolize\ShippingExtensions\Tracker\ViewPageTracker $tracker)
    {
        $this->tracker = $tracker;
    }
    /**
     * Hooks.
     */
    public function hooks() : void
    {
        try {
            $tracker = $this->get_tracker();
            $tracker->add_data_provider(new \FSProVendor\Octolize\ShippingExtensions\Tracker\DataProvider\ShippingExtensionsDataProvider($this->tracker));
        } catch (\Exception $e) {
            // phpcs:ignore
            // Do nothing.
        }
    }
    /**
     * @return WPDesk_Tracker
     * @throws Exception
     */
    protected function get_tracker() : \FSProVendor\WPDesk_Tracker
    {
        $tracker = \apply_filters('wpdesk_tracker_instance', null);
        if ($tracker instanceof \FSProVendor\WPDesk_Tracker) {
            return $tracker;
        }
        throw new \Exception('Tracker not found');
    }
}
