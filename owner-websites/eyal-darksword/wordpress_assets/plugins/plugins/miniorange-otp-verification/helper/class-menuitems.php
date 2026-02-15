<?php
/**
 * Load administrator changes for MenuItems
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\MoInit;
use OTP\Objects\TabDetails;
use OTP\Traits\Instance;

/**
 * This class simply adds menu items for the plugin
 * in the WordPress dashboard.
 */
if ( ! class_exists( 'MenuItems' ) ) {
	/**
	 * MenuItems class
	 */
	final class MenuItems {

		use Instance;

		/**
		 * The URL for the plugin icon to be shown in the dashboard
		 *
		 * @var string
		 */
		private $callback;

		/**
		 * The call back function for the menu items
		 *
		 * @var string
		 */
		private $menu_slug;

		/**
		 * The slug for the main menu
		 *
		 * @var string
		 */
		private $menu_logo;

		/**
		 * Array of PluginPageDetails Object detailing
		 * all the page menu options.
		 *
		 * @var array $tab_details
		 */
		private $tab_details;

		/**
		 * MenuItems constructor.
		 */
		private function __construct() {
			$this->callback    = array( MoInit::instance(), 'mo_customer_validation_options' );
			$this->menu_logo   = MOV_ICON;
			$tab_details       = TabDetails::instance();
			$this->tab_details = $tab_details->tab_details;
			$this->menu_slug   = $tab_details->parent_slug;
			$this->add_main_menu();
			$this->add_sub_menus();
		}
		/**
		 * Adding MainMenu.
		 */
		private function add_main_menu() {
			add_menu_page(
				__( 'OTP Verification', 'miniorange-otp-verification' ),
				__( 'OTP Verification', 'miniorange-otp-verification' ),
				'manage_options',
				$this->menu_slug,
				$this->callback,
				$this->menu_logo
			);
		}
		/**
		 * Adding MainMenu.
		 */
		private function add_sub_menus() {
			foreach ( $this->tab_details as $tab_detail ) {
				add_submenu_page(
					$this->menu_slug,
					$tab_detail->page_title,
					$tab_detail->menu_title,
					'manage_options',
					$tab_detail->menu_slug,
					$this->callback
				);
			}
		}
	}
}
