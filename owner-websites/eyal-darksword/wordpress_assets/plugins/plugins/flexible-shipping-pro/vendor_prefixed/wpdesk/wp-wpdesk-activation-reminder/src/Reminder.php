<?php

namespace FSProVendor\ReminderNamespace;

class Reminder
{
    private $logo_url = 'logo-url';
    public function __construct()
    {
        \add_action('admin_enqueue_scripts', array($this, 'enqueue_reminder_script'));
        \add_action('admin_footer', array($this, 'display_html_element'));
    }
    public function enqueue_reminder_script()
    {
        if ($this->should_display()) {
            \wp_enqueue_script('wpdesk-activation-reminder', \plugins_url('popup-javascript-file'), array(), 'script-version', \true);
            \wp_enqueue_style('wpdesk-activation-reminder', \plugins_url('popup-css-file'), array(), 'script-version');
        }
    }
    public function display_html_element()
    {
        if ($this->should_display()) {
            $logo_url = \plugins_url('plugin-dir' . '/' . $this->logo_url);
            $cookie_name = \md5(\site_url() . 'plugin-dir');
            $subscriptions_url = \admin_url('admin.php?page=wpdesk-licenses');
            $read_more_url = 'https://flexibleshipping.com';
            echo "<span class=\"wpdesk-activation-reminder\" data-plugin_title=\"plugin-title\" data-plugin_dir=\"plugin-dir\" data-logo_url=\"{$logo_url}\" data-cookie_name=\"{$cookie_name}\" data-subscriptions_url=\"{$subscriptions_url}\" data-buy_plugin_url=\"buy-plugin-url\" data-read_more_url=\"{$read_more_url}\" data-how_to_activate_link=\"how-to-activate-link\"></span>";
        }
    }
    private function should_display()
    {
        return \get_locale() !== 'pl_PL' && !$this->is_plugin_activated();
    }
    private function is_plugin_activated()
    {
        return \get_option('api_plugin-dir_activated', '') === 'Activated';
    }
}
if (\defined('ABSPATH')) {
    new \FSProVendor\ReminderNamespace\Reminder();
}
