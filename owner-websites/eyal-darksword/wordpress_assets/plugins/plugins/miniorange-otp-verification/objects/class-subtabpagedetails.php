<?php
/**Load Abstract Class SubtabPageDetails
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Subtab page details class.
 */
if ( ! class_exists( 'SubtabPageDetails' ) ) {
	/**
	 * SubtabPageDetails class
	 *
	 * This class manages the configuration details for individual subtab pages
	 * in the plugin's admin interface. It handles page titles, menu titles,
	 * tab names, views, IDs, CSS styling, and navigation visibility settings.
	 */
	class SubtabPageDetails {

		/**
		 * The page title
		 *
		 * @var string
		 */
		public $page_title;

		/**
		 * The menu title
		 *
		 * @var string
		 */
		public $menu_title;

		/**
		 * Tab name
		 *
		 * @var string
		 */
		public $tab_name;

		/**
		 * The PHP page having the view
		 *
		 * @var string
		 */
		public $view;

		/**
		 * The ID attribute of the tab
		 *
		 * @var string
		 */
		public $id;

		/**
		 * The attribute which decides if this page should be shown
		 * in the navbar
		 *
		 * @var bool
		 */
		public $show_in_nav;

		/**
		 * The inline CSS to be applied to the navbar
		 *
		 * @var string
		 */
		public $css;

		/**
		 * Constructor.
		 *
		 * Initializes the subtab page details with the provided parameters
		 * for page configuration and navigation settings.
		 *
		 * @param string $page_title title of page.
		 * @param string $menu_title title of menu.
		 * @param string $tab_name name of subtab.
		 * @param string $view view of subtab.
		 * @param string $id id of subtab.
		 * @param string $css css of subtab.
		 * @param bool   $show_in_nav whether to show the tab in navbar.
		 * @return void
		 */
		public function __construct( $page_title, $menu_title, $tab_name, $view, $id, $css = '', $show_in_nav = true ) {
			$this->page_title  = $page_title;
			$this->menu_title  = $menu_title;
			$this->tab_name    = $tab_name;
			$this->view        = $view;
			$this->id          = $id;
			$this->show_in_nav = $show_in_nav;
			$this->css         = $css;
		}
	}
}
