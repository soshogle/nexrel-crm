<?php
/**Load Interface PluginPageDetails
 *
 * @package miniorange-otp-verification/objects
 */

namespace OTP\Objects;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'PluginPageDetails' ) ) {
	/**
	 * This class is used to manage plugin page details and navigation.
	 * It handles page titles, menu slugs, navigation settings, and view configurations
	 * for the WordPress admin interface.
	 */
	class PluginPageDetails {

		/**
		 * The page title
		 *
		 * @var string
		 */
		public $page_title;

		/**
		 * The menu slug
		 *
		 * @var string
		 */
		public $menu_slug;

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
		 * URL of the navbar
		 *
		 * @var string
		 */
		public $url;

		/**
		 * The PHP page having the view
		 *
		 * @var string
		 */
		public $view;

		/**
		 * The PHP page having the icon
		 *
		 * @var string
		 */
		public $icon;

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
		 * @param string $page_title page title param.
		 * @param string $menu_slug menu slug param.
		 * @param string $menu_title menu title param.
		 * @param string $tab_name tab name param.
		 * @param string $icon tab icon.
		 * @param string $request_uri request url.
		 * @param string $view view page details.
		 * @param string $id id of page.
		 * @param string $css css of page.
		 * @param bool   $show_in_nav check if need to shown in navbar.
		 * @return void
		 */
		public function __construct( $page_title, $menu_slug, $menu_title, $tab_name, $icon, $request_uri, $view, $id, $css = '', $show_in_nav = true ) {
			$this->page_title  = $page_title;
			$this->menu_slug   = $menu_slug;
			$this->menu_title  = $menu_title;
			$this->tab_name    = $tab_name;
			$this->icon        = $icon;
			$this->url         = add_query_arg( array( 'page' => $this->menu_slug ), $request_uri );
			$this->url         = remove_query_arg( array( 'addon', 'form', 'sms', 'subpage' ), $this->url );
			$this->view        = $view;
			$this->id          = $id;
			$this->show_in_nav = $show_in_nav;
			$this->css         = $css;
		}
	}
}
