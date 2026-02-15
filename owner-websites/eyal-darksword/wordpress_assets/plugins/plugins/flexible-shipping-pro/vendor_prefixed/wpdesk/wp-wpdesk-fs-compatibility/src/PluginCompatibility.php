<?php

/**
 * Class Plugin Compatibility
 *
 * @package WPDesk\FS\Compatibility
 */
namespace FSProVendor\WPDesk\FS\Compatibility;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
/**
 * Class Plugin Compatibility
 */
class PluginCompatibility implements \FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable
{
    /**
     * PluginCompatibility constructor.
     */
    public function hooks()
    {
        \add_action('plugins_loaded', array($this, 'init_plugin_checker'));
    }
    /**
     * Init plugin checker.
     */
    public function init_plugin_checker()
    {
        if (!\is_admin()) {
            return;
        }
        $plugin_compatibility_checker = new \FSProVendor\WPDesk\FS\Compatibility\PluginCompatibilityChecker();
        if (!$plugin_compatibility_checker->are_plugins_compatible()) {
            $notice = new \FSProVendor\WPDesk\FS\Compatibility\Notice($plugin_compatibility_checker);
            $notice->hooks();
            $block_settings = new \FSProVendor\WPDesk\FS\Compatibility\BlockSettings($plugin_compatibility_checker);
            $block_settings->hooks();
        }
    }
}
