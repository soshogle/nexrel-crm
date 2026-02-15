<?php
/**
 * Plugin Name: Easyship
 * Plugin URI: https://wordpress.org/plugins/easyship-woocommerce-shipping-rates/
 * Description: Easyship plugin for easy shipping method
 * Version: 0.9.12
 * Requires at least: 4.7
 * Requires PHP: 7.1
 * Author: Easyship
 * Author URI: https://www.easyship.com
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: easyship-woocommerce-shipping-rates
 * Domain Path: /languages
 * Requires Plugins: woocommerce
 *
 * Developer: Easyship
 * Developer URI: https://www.easyship.com
 *
 * WC requires at least: 3.6.0
 * WC tested up to: 10.3.5
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * @package Easyship
 * @version 0.9.11
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once __DIR__ . '/includes/class-easyship-legacy-guard.php';
Easyship_Legacy_Guard::bootstrap( __FILE__ );

define( 'EASYSHIP_PLUGIN_FILE', __FILE__ );

require_once __DIR__ . '/includes/class-easyship-plugin.php';
$the_plugin = Easyship_Plugin::singleton();
$the_plugin->hook_into_wordpress();
