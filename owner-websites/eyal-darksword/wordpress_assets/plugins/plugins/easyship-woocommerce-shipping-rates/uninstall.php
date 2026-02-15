<?php
/**
 * Uninstall Easyship.
 *
 * NOTE: This file is intentionally not namespaced.
 * NOTE: Multisite not supported.
 *
 * @package Easyship
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	die(); // If uninstall.php is not called by WordPress, die.
}

define( 'EASYSHIP_PLUGIN_FILE', __FILE__ );

require_once __DIR__ . '/includes/class-easyship-plugin.php';
Easyship_Plugin::uninstall();
