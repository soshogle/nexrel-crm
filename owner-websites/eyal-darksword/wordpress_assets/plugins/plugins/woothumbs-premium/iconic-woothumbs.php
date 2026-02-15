<?php
/**
 * Plugin Name: WooThumbs for WooCommerce by Iconic
 * Plugin URI: https://iconicwp.com/products/woothumbs/
 * Description: Multiple images per variation/attribute and customisable image gallery.
 * Version: 5.13.1
 * Author: Iconic
 * Author URI: https://iconicwp.com
 * Text Domain: iconic-woothumbs
 * Domain Path: /languages
 * WC requires at least: 2.6.14
 * WC tested up to: 10.4.3
 * Requires PHP: 7.4
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs class
 */
class Iconic_WooThumbs {
	/**
	 * Version
	 *
	 * @var string
	 */
	public $version = '5.13.1';

	/**
	 * Full name
	 *
	 * @var string
	 */
	public $name = 'WooThumbs for WooCommerce';

	/**
	 * Slug
	 *
	 * @var string
	 */
	public $slug = 'iconic-woothumbs';

	/**
	 * Slug alt (underscores)
	 *
	 * @var string
	 */
	public $slug_alt;

	/**
	 * Variable to hold settings.
	 *
	 * @var array|null
	 */
	public $settings = null;

	/**
	 * Variable to hold settings framework instance.
	 *
	 * @var object
	 */
	public $settings_framework = null;

	/**
	 * Absolute path to this plugin folder, trailing slash
	 *
	 * @var string
	 */
	public $plugin_path;

	/**
	 * URL to this plugin folder, no trailing slash
	 *
	 * @var string
	 */
	public $plugin_url;

	/**
	 * Page slug for bulk edit
	 *
	 * @var string
	 */
	public $bulk_edit_slug;

	/**
	 * Nonce name for ajax requests
	 *
	 * @var string
	 */
	public $ajax_nonce_string;

	/**
	 * Active Plugins List
	 *
	 * @var array
	 */
	public $active_plugins;

	/**
	 * Cache class.
	 *
	 * @var object
	 */
	public $cache;

	/**
	 * The singleton instance of the plugin.
	 *
	 * @var Iconic_WooThumbs
	 */
	private static $instance;

	/**
	 * The DI container.
	 *
	 * @var ContainerInterface
	 */
	private $container;

	/**
	 * Construct
	 */
	function __construct() {
		$this->plugin_path       = plugin_dir_path( __FILE__ );
		$this->plugin_url        = plugin_dir_url( __FILE__ );
		$this->bulk_edit_slug    = $this->slug . '-bulk-edit';
		$this->ajax_nonce_string = $this->slug . '_ajax';
		$this->active_plugins    = apply_filters( 'active_plugins', get_option( 'active_plugins' ) );
		$this->slug_alt          = str_replace( '-', '_', $this->slug );

		$this->define_constants();
		$this->init_autoloader();
		$this->install_db_table();

		if ( ! Iconic_WooThumbs_Core_Helpers::is_plugin_active( 'woocommerce/woocommerce.php' ) ) {
			return;
		}

		$this->load_classes();

		$this->container = new Iconic_WooThumbs_Core_Container();

		// Hook up to the plugins_loaded action.
		add_action( 'plugins_loaded', array( $this, 'plugins_loaded_hook' ) );
		add_action( 'before_woocommerce_init', array( $this, 'declare_hpos_compatibility' ) );
	}

	/**
	 * Instantiate a single instance of our plugin.
	 *
	 * @return Iconic_WooThumbs
	 */
	public static function instance() {
		if ( ! isset( self::$instance ) ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Get the DI container.
	 *
	 * @return ContainerInterface
	 */
	public function container() {
		return $this->container;
	}

	/**
	 * Define Constants.
	 */
	private function define_constants() {
		$this->define( 'ICONIC_WOOTHUMBS_FILE', __FILE__ );
		$this->define( 'ICONIC_WOOTHUMBS_PATH', $this->plugin_path );
		$this->define( 'ICONIC_WOOTHUMBS_URL', $this->plugin_url );
		$this->define( 'ICONIC_WOOTHUMBS_INC_PATH', $this->plugin_path . 'inc/' );
		$this->define( 'ICONIC_WOOTHUMBS_VENDOR_PATH', ICONIC_WOOTHUMBS_INC_PATH . 'vendor/' );
		$this->define( 'ICONIC_WOOTHUMBS_TEMPLATES_PATH', $this->plugin_path . 'templates/' );
		$this->define( 'ICONIC_WOOTHUMBS_BASENAME', plugin_basename( __FILE__ ) );
		$this->define( 'ICONIC_WOOTHUMBS_IS_ENVATO', false );
		$this->define( 'ICONIC_WOOTHUMBS_PLUGIN_PATH_FILE', str_replace( trailingslashit( wp_normalize_path( WP_PLUGIN_DIR ) ), '', wp_normalize_path( ICONIC_WOOTHUMBS_FILE ) ) );
	}

	/**
	 * Define constant if not already set.
	 *
	 * @param string      $name
	 * @param string|bool $value
	 */
	private function define( $name, $value ) {
		if ( ! defined( $name ) ) {
			define( $name, $value );
		}
	}

	/**
	 * Init autoloader.
	 */
	private function init_autoloader() {
		require_once ICONIC_WOOTHUMBS_PATH . 'vendor-prefixed/autoload.php';
		require_once ICONIC_WOOTHUMBS_INC_PATH . 'class-core-autoloader.php';

		Iconic_WooThumbs_Core_Autoloader::run(
			array(
				'prefix'   => 'Iconic_WooThumbs_',
				'inc_path' => ICONIC_WOOTHUMBS_INC_PATH,
			)
		);
	}

	/**
	 * Load classes
	 */
	private function load_classes() {
		$this->init_license();
		$this->init_telemetry();

		Iconic_WooThumbs_Core_Settings::run(
			array(
				'vendor_path'   => ICONIC_WOOTHUMBS_VENDOR_PATH,
				'title'         => $this->name,
				'version'       => $this->version,
				'menu_title'    => 'WooThumbs',
				'settings_path' => ICONIC_WOOTHUMBS_INC_PATH . 'admin/settings.php',
				'option_group'  => $this->slug_alt,
				'docs'          => array(
					'collection'      => 'woothumbs-for-woocommerce/',
					'troubleshooting' => 'woothumbs-for-woocommerce/wt-troubleshooting/',
					'getting-started' => 'woothumbs-for-woocommerce/how-to-install-woothumbs-for-woocommerce/',
				),
			)
		);

		Iconic_WooThumbs_Settings::run();
		Iconic_WooThumbs_Update::run();
		Iconic_WooThumbs_Template_Hooks::run();
		Iconic_WooThumbs_Shortcodes::run();
		Iconic_WooThumbs_Media::run();
		Iconic_WooThumbs_Images::run();
		Iconic_WooThumbs_Product_Variation::run();
		Iconic_WooThumbs_Import::run();
		Iconic_WooThumbs_Block::run();
		Iconic_WooThumbs_Product_Tabs::run( $this->slug );
		Iconic_WooThumbs_Attributes::run();
		Iconic_WooThumbs_REST_API::run();

		Iconic_WooThumbs_Compat_WPML::run();
		Iconic_WooThumbs_Compat_Yith_Badge::run();
		Iconic_WooThumbs_Compat_Astra::run();
		Iconic_WooThumbs_Compat_Elementor::run();
		Iconic_WooThumbs_Compat_Divi::run();
		Iconic_WooThumbs_Compat_Flatsome::run();
		Iconic_WooThumbs_Compat_ShortPixel_Adaptive_Images::run();
		Iconic_WooThumbs_Compat_WP_All_import::run();
		Iconic_WooThumbs_Compat_WCPB_Badges::run();
		Iconic_WooThumbs_Compat_Woostify::run();
		Iconic_WooThumbs_Compat_Iconic_QuickView::run();
		Iconic_WooThumbs_Compat_BB_Themer::run();

		include_once ICONIC_WOOTHUMBS_PATH . 'inc/admin/product-block-editor/class-product-block-editor.php';
		Iconic_WooThumbs_Product_Block_Editor::run();

		add_action( 'plugins_loaded', array( 'Iconic_WooThumbs_Core_Onboard', 'run' ), 10 );
	}

	/**
	 * Init licence class.
	 */
	public function init_license() {
		// Allows us to transfer Freemius license.
		if ( file_exists( ICONIC_WOOTHUMBS_PATH . 'class-core-freemius-sdk.php' ) ) {
			require_once ICONIC_WOOTHUMBS_PATH . 'class-core-freemius-sdk.php';

			new Iconic_WooThumbs_Core_Freemius_SDK(
				array(
					'plugin_path'        => ICONIC_WOOTHUMBS_PATH,
					'plugin_file'        => ICONIC_WOOTHUMBS_FILE,
					'uplink_plugin_slug' => 'iconic-woothumbs',
					'freemius'           => array(
						'id'         => '869',
						'slug'       => 'woothumbs',
						'public_key' => 'pk_3e970b87cd0ed00b398a760433a79',
					),
				)
			);
		}

		Iconic_WooThumbs_Core_License_Uplink::run(
			array(
				'basename'        => ICONIC_WOOTHUMBS_BASENAME,
				'plugin_slug'     => 'iconic-woothumbs',
				'plugin_name'     => $this->name,
				'plugin_version'  => $this->version,
				'plugin_path'     => ICONIC_WOOTHUMBS_PLUGIN_PATH_FILE,
				'plugin_class'    => self::class,
				'option_group'    => $this->slug_alt,
				'urls'            => array(
					'product' => 'https://iconicwp.com/products/woothumbs/',
				),
				'container_class' => self::class,
				'license_class'   => Iconic_WooThumbs_Core_Uplink_Helper::class,
			)
		);
	}

	/**
	 * Init telemetry class.
	 *
	 * @return void
	 */
	public function init_telemetry() {
		Iconic_WooThumbs_Core_Telemetry::run(
			array(
				'file'                  => __FILE__,
				'plugin_slug'           => 'iconic-woothumbs',
				'option_group'          => $this->slug_alt,
				'plugin_name'           => $this->name,
				'plugin_url'            => ICONIC_WOOTHUMBS_URL,
				'opt_out_settings_path' => 'sections/license/fields',
				'container_class'       => self::class,
			)
		);
	}

	/**
	 * Install the DB table.
	 *
	 * @return void
	 */
	private function install_db_table() {
		add_action( 'plugins_loaded', array( 'Iconic_WooThumbs_Cache', 'install_table' ) );
	}

	/**
	 * Expose Cache class.
	 *
	 * Access the cache class without loading multiple times.
	 */
	public function cache_class() {
		if ( ! $this->cache ) {
			$this->cache = new Iconic_WooThumbs_Cache();
		}

		return $this->cache;
	}

	/**
	 * Set settings.
	 */
	public function set_settings() {
		/**
		 * Filter: modify WooThumbs settings on init
		 *
		 * @since 5.6.0
		 * @filter iconic_woothumbs_set_settings
		 * @param array $settings Plugin settings.
		 */
		$this->settings = apply_filters( 'iconic_woothumbs_set_settings', Iconic_WooThumbs_Core_Settings::$settings );
	}

	/**
	 * Runs on plugins_loaded
	 */
	public function plugins_loaded_hook() {
		load_plugin_textdomain( 'iconic-woothumbs', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

		if ( apply_filters( 'iconic_woothumbs_is_admin', is_admin() ) ) {
			$this->cache_class()::delete_cache_entries();

			add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts' ) );
			add_action( 'woocommerce_save_product_variation', array( $this, 'save_product_variation' ), 10, 2 );
			add_action( 'admin_menu_iconic_woothumbs', array( $this, 'bulk_edit_page' ), 10 );
			add_action( 'admin_init', array( $this, 'media_columns' ) );

			add_action( 'wp_ajax_admin_load_thumbnails', array( $this, 'admin_load_thumbnails' ) );
			add_action( 'wp_ajax_iconic-woothumbs_bulk_save', array( $this, 'bulk_save' ) );
			add_action( 'wp_ajax_iconic_woothumbs_get_variation', array( $this, 'ajax_get_variation' ) );
			add_action( 'wp_ajax_nopriv_iconic_woothumbs_get_variation', array( $this, 'ajax_get_variation' ) );
		} else {
			add_action( 'woocommerce_before_single_product', array( $this, 'remove_hooks' ) );

			if ( ! function_exists( 'wp_is_block_theme' ) || ! wp_is_block_theme() ) {
				add_action( 'woocommerce_before_single_product', array( $this, 'remove_hooks' ) );
				add_action( 'woocommerce_before_single_product_summary', array( $this, 'show_product_images' ), 20 );
			}

			add_action( 'wp_enqueue_scripts', array( $this, 'register_scripts_and_styles' ), 100 );
			add_action( 'wp_enqueue_scripts', array( $this, 'dequeue_wc_photoswipe' ), 110 );

			add_filter( 'body_class', array( $this, 'add_theme_class' ) );

			// In stacked mode, we need the wishlist icon to be inside the slides
			// so that the icon hover logic and styles work as expected.
			//
			// However, we still need the icons inside the all images wrap to clone
			// them via JS for the non-PHP rendered galleries.
			if ( 'stacked' === Iconic_WooThumbs_Core_Settings::get_setting_from_db( 'display', 'general_layout' ) ) {
				add_action( 'iconic_woothumbs_image', array( $this, 'add_yith_wishlist_icon' ) );
				add_action( 'iconic_woothumbs_after_images', array( $this, 'add_yith_wishlist_icon' ) );
			} else {
				add_action( 'iconic_woothumbs_after_images', array( $this, 'add_yith_wishlist_icon' ) );
			}

			add_action( 'woocommerce_api_product_response', array( $this, 'woocommerce_api_product_response' ), 10, 4 );

			add_action( 'woocommerce_before_variations_form', array( $this, 'generate_variation_data' ) );

			add_action( 'after_setup_theme', array( $this, 'after_setup_theme_hook' ), 100 );

			add_filter( 'rocket_rucss_external_exclusions', array( $this, 'exclude_css_from_wprocket_rucss' ) );
		}
	}

	/**
	 * Runs on after_setup_theme
	 */
	public function after_setup_theme_hook() {
		remove_theme_support( 'wc-product-gallery-lightbox' );
		add_filter( 'current_theme_supports-wc-product-gallery-lightbox', '__return_false', 50 );
	}

	/**
	 * Output variation JSON data via front-end <script> tag output.
	 *
	 * @param WC_Product|false $product WooCommerce product object.
	 * @return void
	 */
	public function generate_variation_data( $product = false ) {
		if ( ! $product ) {
			global $product;
		}

		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return;
		}

		$variations = $product->get_children();

		if ( ! $variations ) {
			return;
		}

		$variation_data = array();

		foreach ( $variations as $variation_id ) {
			$variation_images = Iconic_WooThumbs_Product::get_images( $variation_id );

			if ( $variation_images ) {
				$variation_data[ $variation_id ] = $variation_images;
			}
		}
		?>
		<script>
			(function( $, document ) {
				if ( typeof window.iconic_woothumbs_variations_data === 'undefined' ) {
					window.iconic_woothumbs_variations_data = [];
				}
				window.iconic_woothumbs_variations_data[ <?php echo esc_js( $product->get_id() ); ?> ] = <?php echo wp_json_encode( $variation_data ); ?>;
			}( jQuery, document ));
		</script>
		<?php
	}

	/**
	 * Frontend: Add Theme Class to Body
	 *
	 * @param array $classes exisiting classes.
	 *
	 * @return array
	 */
	public function add_theme_class( $classes ) {
		$theme_name = sanitize_title_with_dashes( wp_get_theme() );

		$classes[] = $this->slug . '-' . $theme_name;

		if (
			isset( $this->settings['fullscreen_general_theme'] ) &&
			'light' === $this->settings['fullscreen_general_theme']
			) {
			$classes[] = 'woothumbs-fullscreen-theme--light';
		}

		return $classes;
	}

	/**
	 * Helper: Is Enabled
	 *
	 * Check whether WooThumbs is enabled for this product
	 *
	 * @return bool
	 */
	public function is_enabled( $post_id = null ) {
		global $post, $product;

		$object    = ( is_object( $product ) ) ? $product : $post;
		$object_id = ( is_object( $product ) ) ? $object->get_id() : $object->ID;

		if ( $post_id ) {
			$object_id = $post_id;
		}

		if ( empty( $object_id ) ) {
			return false;
		}

		// Allow this to be filtered without fetching the post meta.
		$enabled_filtered = apply_filters( 'iconic_woothumbs_is_enabled', null, $object_id );

		if ( ! is_null( $enabled_filtered ) ) {
			return $enabled_filtered;
		}

		$enabled = get_post_meta( $object_id, 'disable_woothumbs', true ) !== 'yes';

		return $enabled;
	}

	/**
	 * Is WooThumbs capable of being rendered
	 * in the current context?
	 *
	 * @param object|null $post WP_Post instance or null.
	 */
	public function can_woothumbs_render_in_context( $post = null ) {
		if ( ! $post ) {
			return false;
		}

		$is_product_check           = ( function_exists( 'is_product' ) && is_product() );
		$has_product_page_shortcode = has_shortcode( $post->post_content, 'product_page' );
		$has_woothumbs_shortcode    = has_shortcode( $post->post_content, 'woothumbs-gallery' );
		$has_woothumbs_block        = ( function_exists( 'has_block' ) && has_block( 'iconic-woothumbs/block', $post->post_content ) );
		$has_single_product_block   = ( function_exists( 'has_block' ) && has_block( 'woocommerce/single-product', $post->post_content ) );

		if (
			$is_product_check ||
			$has_product_page_shortcode ||
			$has_woothumbs_shortcode ||
			$has_woothumbs_block ||
			$has_single_product_block
		) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Helper: Get Product ID from Slug
	 *
	 * Gets the product id from the slug of the current product
	 *
	 * @return int
	 */
	public function get_post_id_from_slug() {
		global $wpdb;

		$slug = str_replace( array( '/product/', '/' ), '', $_SERVER['REQUEST_URI'] );

		$sql = "
            SELECT
                ID
            FROM
                $wpdb->posts
            WHERE
                post_type = \"product\"
            AND
                post_name = \"%s\"
        ";

		return $wpdb->get_var( $wpdb->prepare( $sql, $slug ) );
	}

	/**
	 * Admin: Add Bulk Edit Page
	 */
	public function bulk_edit_page() {
		add_submenu_page( 'woocommerce', esc_html__( 'Bulk Edit Variation Images', 'iconic-woothumbs' ), sprintf( '<span class="fs-submenu-item fs-sub woothumbs">%s</span>', __( 'Bulk Edit', 'iconic-woothumbs' ) ), 'manage_woocommerce', $this->bulk_edit_slug, array( $this, 'bulk_edit_page_display' ) );
	}

	/**
	 * Admin: Display Bulk Edit Page
	 */
	public function bulk_edit_page_display() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'iconic-woothumbs' ) );
		}

		require_once 'inc/admin/bulk-edit.php';
	}

	/**
	 * Admin: Save Bulk Edit Page
	 */
	function bulk_save() {
		check_ajax_referer( $this->ajax_nonce_string, 'nonce' );

		header( 'Content-Type: application/json' );

		$return = array(
			'result'  => 'success',
			'content' => '',
			'message' => '',
		);

		$images       = sanitize_text_field( trim( filter_input( INPUT_POST, 'images' ) ) );
		$variation_id = absint( filter_input( INPUT_POST, 'varid', FILTER_SANITIZE_NUMBER_INT ) );

		// Validate input
		$re = '/^\d+(?:,\d+)*$/'; // numbers or commas

		// if input contains only numbers or commas OR nothing was entered
		if ( preg_match( $re, $images ) || '' === $images ) {
			$images    = array_map( 'trim', explode( ',', $images ) );
			$variation = wc_get_product( $variation_id );

			if ( empty( $variation ) ) {
				$return['result'] = 'failed';
			} else {
				$variation->set_gallery_image_ids( $images );
				$variation->save();
			}

			// if any other character is found
		} else {
			$return['result'] = 'invalid-format';
		}

		switch ( $return['result'] ) {
			case 'invalid-format':
				$return['message'] = esc_html__( 'Please use only numbers and commas.', 'iconic-woothumbs' );
				break;
			case 'failed':
				$return['message'] = esc_html__( 'Sorry, an error occurred. Please try again.', 'iconic-woothumbs' );
				break;
		}

		$return['postdata'] = $_POST;

		echo json_encode( $return );

		$this->cache_class()::delete_cache_entries( true );

		wp_die();
	}

	/**
	 * Admin: Setup new media column for image IDs
	 */
	function media_columns() {
		add_filter( 'manage_media_columns', array( $this, 'media_id_col' ) );
		add_action( 'manage_media_custom_column', array( $this, 'media_id_col_val' ), 10, 2 );
	}

	/**
	 * Admin: Media column name
	 */
	function media_id_col( $cols ) {
		$cols['mediaid'] = 'Image ID';

		return $cols;
	}

	/**
	 * Admin: media column content
	 *
	 * @param string $column_name
	 * @param int    $id
	 *
	 * @return string
	 */
	function media_id_col_val( $column_name, $id ) {
		if ( $column_name == 'mediaid' ) {
			echo $id;
		}
	}

	/**
	 * Admin: Scripts
	 */
	public function admin_scripts() {
		global $post, $pagenow;

		$get_page = sanitize_text_field( filter_input( INPUT_GET, 'page' ) );

		if (
			( $post && ( 'product' === get_post_type( $post->ID ) && ( 'post.php' === $pagenow || 'post-new.php' === $pagenow ) ) ) ||
			( 'admin.php' === $pagenow && $get_page && $get_page === $this->bulk_edit_slug ) ||
			( $get_page && ( 'iconic-woothumbs-settings-account' === $get_page || 'iconic-woothumbs-settings' === $get_page ) ) ||
			'upload.php' === $pagenow ||
			( 'post.php' === $pagenow && 'attachment' === get_post_type( $post->ID ) )
		) {
			$min = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';

			wp_enqueue_media();

			$js_path = 'assets/admin/js/main' . $min . '.js';

			wp_enqueue_script(
				$this->slug . '-admin-js',
				plugins_url( $js_path, __FILE__ ),
				array( 'jquery' ),
				filemtime( plugin_dir_path( __FILE__ ) . $js_path ),
				true
			);

			$css_path = 'assets/admin/css/admin-styles' . $min . '.css';

			wp_enqueue_style(
				$this->slug . '-admin-css',
				plugins_url( $css_path, __FILE__ ),
				false,
				filemtime( plugin_dir_path( __FILE__ ) . $css_path )
			);

			$vars = array(
				'ajaxurl' => admin_url( 'admin-ajax.php', 'relative' ),
				'nonce'   => wp_create_nonce( $this->ajax_nonce_string ),
				'slug'    => $this->slug,
				'text'    => array(
					'attribute_all_attributes' => esc_html__( 'Attribute: All Attributes', 'iconic-woothumbs' ),
					'attribute'                => esc_html__( 'Attribute:', 'iconic-woothumbs' ),
					'all_terms'                => esc_html__( 'All Terms', 'iconic-woothumbs' ),
					'remove'                   => esc_html__( 'Remove', 'iconic-woothumbs' ),
					'remove_image'             => esc_html__( 'Remove image', 'iconic-woothumbs' ),
					'select'                   => esc_html__( 'Select', 'iconic-woothumbs' ),
					'filter'                   => esc_html__( 'Filter', 'iconic-woothumbs' ),
					'terms'                    => esc_html__( 'terms...', 'iconic-woothumbs' ),
					'add_images'               => esc_html__( 'Add Images', 'iconic-woothumbs' ),
					'add_to'                   => esc_html__( 'Add to', 'iconic-woothumbs' ),
					'add'                      => esc_html__( 'Add', 'iconic-woothumbs' ),
					'click_to_toggle'          => esc_html__( 'Click to toggle', 'iconic-woothumbs' ),
					'manage_images_for'        => esc_html__( 'Manage Images for', 'iconic-woothumbs' ),
					'sure_remove_images'       => esc_html__( 'Are you sure you want to remove the images for this term?', 'iconic-woothumbs' ),
					'sure_cancel_changes'      => esc_html__( 'Are you sure you want to cancel these changes?', 'iconic-woothumbs' ),
					'remove_image'             => esc_html__( 'Remove image', 'iconic-woothumbs' ),
					'add_variation_images'     => esc_html__( 'Add Variation Images', 'iconic-woothumbs' ),
					'manage_variation_images'  => esc_html__( 'Manage Variation Images', 'iconic-woothumbs' ),
					'add_to_variation'         => esc_html__( 'Add to variation', 'iconic-woothumbs' ),
					'select_mp4'               => esc_html__( 'Select MP4/WEBM', 'iconic-woothumbs' ),
					'attach_mp4'               => esc_html__( 'Attach MP4/WEBM', 'iconic-woothumbs' ),
				),
			);

			wp_localize_script( $this->slug . '-admin-js', 'iconic_woothumbs_vars', $vars );
		}
	}

	/**
	 * Admin: Save variation images
	 *
	 * @param int $variation_id
	 * @param int $i
	 */
	public function save_product_variation( $variation_id, $i ) {
		$this->cache_class()::delete_cache_entries( true, $variation_id );

		$image_gallery = filter_input( INPUT_POST, 'variation_image_gallery', FILTER_DEFAULT, FILTER_REQUIRE_ARRAY );

		if ( $image_gallery && isset( $image_gallery[ $variation_id ] ) ) {
			$variation = wc_get_product( $variation_id );

			// Remove legacy meta field.
			$variation->delete_meta_data( 'variation_image_gallery' );

			$gallery_image_ids = explode( ',', $image_gallery[ $variation_id ] );
			$variation->set_gallery_image_ids( $gallery_image_ids );

			$variation->save();
		}
	}

	/**
	 * Ajax: Load thumbnails via ajax for variation tabs
	 *
	 * This method has been refactored to only return image IDs
	 * and the HTML of the images; all additional HTML markup
	 * has been moved to `admin-scripts.js`.
	 */
	public function admin_load_thumbnails() {
		if ( ! isset( $_REQUEST['nonce'] ) || ! wp_verify_nonce( $_REQUEST['nonce'], $this->ajax_nonce_string ) ) {
			wp_send_json_error( array( 'msg' => esc_html__( 'Invalid Nonce', 'iconic-woothumbs' ) ) );
		}

		if ( ! isset( $_REQUEST['var_ids'] ) ) {
			wp_send_json_error( array( 'msg' => esc_html__( 'No variation IDs supplied', 'iconic-woothumbs' ) ) );
		}

		$raw_var_ids = json_decode( filter_input( INPUT_GET, 'var_ids' ) );

		if ( ! $raw_var_ids ) {
			wp_send_json_error( array( 'msg' => esc_html__( 'Variation ID data is malformed', 'iconic-woothumbs' ) ) );
		}

		$data    = array();
		$var_ids = array_map( 'absint', $raw_var_ids );

		foreach ( $var_ids as $var_id ) {
			$product           = wc_get_product( $var_id );
			$gallery_image_ids = $product->get_gallery_image_ids();

			$data[ $var_id ]['image_ids'] = array();
			$data[ $var_id ]['images']    = array();

			if ( ! empty( $gallery_image_ids ) ) {
				$data[ $var_id ]['image_ids'] = $gallery_image_ids;

				foreach ( $gallery_image_ids as $image_id ) {
					ob_start();
					echo wp_get_attachment_image( $image_id, 'thumbnail' );
					$html = ob_get_clean();

					$data[ $var_id ]['images'][] = array(
						'id'   => $image_id,
						'html' => $html,
					);
				}
			}
		}

		$encoded_data = wp_json_encode( $data );

		if ( $encoded_data ) {
			wp_send_json_success( $encoded_data );
		} else {
			wp_send_json_error();
		}
	}

	/**
	 * Frontend: Remove product images
	 */
	public function remove_hooks() {
		if ( apply_filters( 'woothumbs_enabled', $this->is_enabled() ) ) {
			remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 10 );
			remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 20 );

			// Mr. Tailor
			remove_action( 'woocommerce_before_single_product_summary_product_images', 'woocommerce_show_product_images', 20 );
			remove_action( 'woocommerce_product_summary_thumbnails', 'woocommerce_show_product_thumbnails', 20 );

			// Remove images from Bazar theme
			if ( class_exists( 'YITH_WCMG' ) ) {
				$this->remove_filters_for_anonymous_class( 'woocommerce_before_single_product_summary', 'YITH_WCMG_Frontend', 'show_product_images', 20 );
				$this->remove_filters_for_anonymous_class( 'woocommerce_product_thumbnails', 'YITH_WCMG_Frontend', 'show_product_thumbnails', 20 );
			}
		}
	}

	/**
	 * Frontend: Add product images
	 *
	 * @param array $atts Shortcode attributes.
	 */
	public function show_product_images( $atts = array() ) {
		global $product, $post;

		if ( empty( $product ) ) {
			if ( ! $post || ! is_a( $post, 'WP_Post' ) ) {
				return;
			}

			// If we don't have the product ID, we could be in the context of
			// the WC single product block, so let's attempt to get the ID.
			$product_id = Iconic_WooThumbs_Helpers::get_single_product_block_product_id( $post );

			if ( ! $product_id ) {
				return;
			}

			$product = wc_get_product( $product_id );

			if ( ! $product ) {
				return;
			}
		}

		if ( apply_filters( 'woothumbs_enabled', $this->is_enabled() ) ) {
			$selected_product_id = Iconic_WooThumbs_Product::get_selected_product_id( $product );

			$args = array(
				'attributes'                               => $atts,
				'selected_product_id'                      => $selected_product_id,
				'images'                                   => Iconic_WooThumbs_Product::get_images( $selected_product_id, true ),
				'default_images'                           => Iconic_WooThumbs_Product::get_images( $product->get_id() ),
				'maintain_slide_index'                     => ! empty( $this->settings['variations_settings_maintain_slide_index'] ) ? 'yes' : 'no',
				'video_url'                                => Iconic_WooThumbs_Product::get_setting( $product->get_id(), 'video_url' ),
				'classes'                                  => array(
					'iconic-woothumbs-all-images-wrap',
					'iconic-woothumbs-all-images-wrap--layout-' . $this->settings['display_general_layout'],
					sprintf( 'iconic-woothumbs-all-images-wrap--thumbnails-%s', $this->settings['navigation_thumbnails_position'] ),
				),
				'navigation_thumbnails_position'           => $this->settings['navigation_thumbnails_position'],
				'navigation_thumbnails_enable'             => $this->settings['navigation_thumbnails_enable'],
				'navigation_thumbnails_count'              => $this->settings['navigation_thumbnails_count'],
				'navigation_thumbnails_type'               => $this->settings['navigation_thumbnails_type'],
				'navigation_general_controls'              => $this->settings['navigation_general_controls'],
				'fullscreen_general_enable'                => $this->settings['fullscreen_general_enable'],
				'display_general_gallery_colour_primary'   => $this->settings['display_general_gallery_colour_primary'],
				'display_general_gallery_colour_secondary' => $this->settings['display_general_gallery_colour_secondary'],
				'fullscreen_general_click_anywhere'        => $this->settings['fullscreen_general_click_anywhere'],
			);

			if ( $selected_product_id === $product->get_id() ) {
				$args['classes'][] = 'iconic-woothumbs-reset';
			}

			if ( $this->settings['display_general_icons_hover'] ) {
				$args['classes'][] = 'iconic-woothumbs-hover-icons';
			}

			if ( $this->settings['display_general_icons_tooltips'] ) {
				$args['classes'][] = 'iconic-woothumbs-tooltips-enabled';
			}

			if ( $this->settings['zoom_general_enable'] ) {
				$args['classes'][] = 'iconic-woothumbs-zoom-enabled';
			}

			if ( is_rtl() ) {
				$args['classes'][] = 'iconic-woothumbs-all-images-wrap--rtl';
			}

			$has_media = false;
			foreach ( $args['images'] as $image_data ) {
				if ( ! empty( $image_data['media_embed'] ) ) {
					$has_media = true;
					break;
				}
			}

			if ( $args['video_url'] ) {
				$args['classes'][] = 'iconic-woothumbs-all-images-wrap--has-product-media';
			}

			if ( $has_media ) {
				$args['classes'][] = 'iconic-woothumbs-all-images-wrap--has-media';
			}

			if ( ! empty( $atts['gallery_align'] ) ) {
				$args['classes'][] = 'iconic-woothumbs-all-images-wrap--block-align-' . esc_attr( $atts['gallery_align'] );
			}

			/**
			 * Filter: iconic_woothumbs_show_product_images_args
			 *
			 * @param array      $args    Array of gallery presentation arguments.
			 * @param WC_Product $product WC Product object.
			 *
			 * @return array
			 */
			$args = apply_filters( 'iconic_woothumbs_show_product_images_args', $args, $product );

			Iconic_WooThumbs_Template_Hooks::get_woothumbs_template( 'gallery.php', $args, 'require' );
		}
	}

	/**
	 * Frontend: Register scripts and styles
	 */
	public function register_scripts_and_styles() {
		global $post, $jckqv;

		if ( ! $post ) {
			return;
		}

		if (
			apply_filters( 'iconic_woothumbs_load_assets', false ) ||
			$jckqv ||
			(
				$this->can_woothumbs_render_in_context( $post ) &&
				apply_filters( 'woothumbs_enabled', $this->is_enabled() )
			) ||
			is_woocommerce() ||
			is_product_category()
		) {
			// Vars.
			$min = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';

			// Vendor Specific CSS & JS.
			$this->enqueue_photoswipe();
			$this->enqueue_tooltipster();
			$this->enqueue_slick();
			$this->enqueue_plyr();
			$this->enqueue_hoverintent();

			// Core CSS & JS.
			$this->load_file( $this->slug . '-css', '/assets/frontend/css/main' . $min . '.css' );
			$this->load_file( $this->slug . '-script', '/assets/frontend/js/main' . $min . '.js', true, array( 'jquery', 'wp-util', 'wp-hooks' ) );

			$vars = array(
				'ajaxurl'         => admin_url( 'admin-ajax.php', 'relative' ),
				'plyr_sprite_url' => plugins_url( 'assets/img/plyr.svg', __FILE__ ),
				'nonce'           => wp_create_nonce( $this->ajax_nonce_string ),
				'loading_icon'    => plugins_url( 'assets/frontend/img/loading.gif', __FILE__ ),
				'slug'            => $this->slug,
				'settings'        => $this->settings,
				'text'            => array(
					'fullscreen' => __( 'Fullscreen', 'iconic-woothumbs' ),
					'video'      => __( 'Play Product Video', 'iconic-woothumbs' ),
				),
				'is_rtl'          => is_rtl(),
				'dedupe_images'   => Iconic_WooThumbs_Images::get_dedupe_images(),
				/**
				 * Filter: iconic_woothumbs_js_tpl
				 *
				 * @since 4.10.0
				 * @param array $template Array of HTML strings.
				 *
				 * @return array
				 */
				'tpl'             => apply_filters( 'iconic_woothumbs_js_tpl', array() ),
			);

			// Expose SVG icon markup.
			$icons = array(
				'loading',
				'video',
				'fullscreen',
				'arrow-left',
				'arrow-right',
				'arrow-up',
				'arrow-down',
				'zoom',
				'close',
			);

			foreach ( $icons as $icon ) {
				$icon_slug = str_replace( '-', '_', $icon );
				$classes   = array();

				if ( in_array( $icon, array( 'arrow-left', 'arrow-right', 'zoom', 'close' ), true ) ) {
					$classes[] = 'pswp__icn';
				}

				// This var is for general usage outside of PhotoSwipe.
				$vars[ 'icon_' . $icon_slug ] = wp_json_encode( Iconic_WooThumbs_Icons::get_svg_icon( $icon, false, true ) );

				// This additional entry is for PhotoSwipe, which demands a class on each icon.
				$vars[ 'icon_pswp_' . $icon_slug ] = wp_json_encode( Iconic_WooThumbs_Icons::get_svg_icon( $icon, $classes, true ) );
			}

			wp_localize_script( $this->slug . '-script', 'iconic_woothumbs_vars', $vars );

			add_action( 'wp_head', array( $this, 'dynamic_css' ) );
		}
	}

	/**
	 * Dequeue the PhotoSwipe assets enqueued by WooCommerce core
	 * to resolve fullscreen issues in WooThumbs.
	 *
	 * @return void
	 */
	function dequeue_wc_photoswipe() {
		global $post;

		/**
		 * Filter: Dequeue WC photoswipe assets.
		 *
		 * @filter iconic_woothumbs_dequeue_wc_photoswipe_assets
		 * @since 5.6.0
		 * @param bool $dequeue Whether to dequeue WC photoswipe assets.
		 */
		$dequeue = apply_filters( 'iconic_woothumbs_dequeue_wc_photoswipe_assets', true );

		if ( ! $dequeue || ! $this->can_woothumbs_render_in_context( $post ) || ! $this->is_enabled( $post ) ) {
			return;
		}

		// WooCommerce 10.3.0 added the prefix `wc-` for its assets
		wp_dequeue_style( 'wc-photoswipe' );
		wp_dequeue_style( 'wc-photoswipe-default-skin' );
		// Backward compatibility with versions < 10.3.0
		wp_dequeue_style( 'photoswipe' );
		wp_dequeue_style( 'photoswipe-default-skin' );

		// WooCommerce 10.3.0 added the prefix `wc-` for its assets
		wp_dequeue_script( 'wc-photoswipe' );
		wp_dequeue_script( 'wc-photoswipe-ui-default' );
		// Backward compatibility with versions < 10.3.0
		wp_dequeue_script( 'photoswipe' );
		wp_dequeue_script( 'photoswipe-ui-default' );
	}

	/**
	 * Enqueue Photoswipe
	 */
	public function enqueue_photoswipe() {
		if ( $this->maybe_enable_fullscreen() ) {
			if ( ! wp_script_is( 'woothumbs-photoswipe-lightbox', 'enqueued' ) ) {
				$this->load_file( 'woothumbs-photoswipe-lightbox', '/assets/frontend/js/lib/photoswipe/photoswipe-lightbox.min.js', true, array( 'jquery', 'wp-util' ) );
				$this->load_file( 'woothumbs-photoswipe-core', '/assets/frontend/js/lib/photoswipe/photoswipe-core.min.js', true, array( 'jquery', 'wp-util' ) );
			}
		}
	}

	/**
	 * Enqueue Tooltipster
	 */
	public function enqueue_tooltipster() {
		if ( $this->settings['display_general_icons_tooltips'] ) {
			if ( ! wp_script_is( 'tooltipster', 'enqueued' ) ) {
				$this->load_file( 'tooltipster', '/assets/frontend/js/lib/tooltipster/jquery.tooltipster.min.js', true );
				$this->load_file( 'tooltipster', '/assets/frontend/css/lib/tooltipster/tooltipster.css' );
			}
		}
	}

	/**
	 * Enqueue Slick.
	 */
	public function enqueue_slick() {
		if ( 'slider' === $this->settings['display_general_layout'] ) {
			if ( ! wp_script_is( 'slick-carousel', 'enqueued' ) ) {
				$this->load_file( 'slick-carousel', '/assets/frontend/css/lib/slick/slick.css' );
				$this->load_file( 'slick-carousel', '/assets/frontend/js/lib/slick/slick.min.js', true );
			}
		}
	}

	/**
	 * Enqueue Plyr
	 */
	public function enqueue_plyr() {
		global $post, $product, $iconic_woothumbs_class;

		$enqueue_plyr = true;
		$found_embed  = false;

		if ( is_object( $product ) ) {
			$product_id = $product->get_id();
		} elseif ( is_object( $post ) ) {
			$product_id = $post->ID;
		} else {
			$product_id = false;
		}

		// Make sure the ID is a product, not a page/post with a shortcode.
		$product   = ( $product_id ) ? wc_get_product( $product_id ) : $product_id;
		$video_url = Iconic_WooThumbs_Product::get_setting( $product_id, 'video_url' );

		if ( $video_url ) {
			$found_embed = true;
		}

		if ( ! $found_embed && $this->settings['performance_cache_enable'] && $product ) {
			$cache_key     = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $product_id, 'images' );
			$cached_images = $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key );
			$variations    = $product->get_children();

			if ( ! $cached_images ) {
				$cached_images = array();
			}

			if ( $variations ) {
				foreach ( $variations as $variation_id ) {
					$cache_key               = $iconic_woothumbs_class->cache_class()::get_cache_key_name( $variation_id, 'images' );
					$cached_variation_images = $iconic_woothumbs_class->cache_class()::get_cache_entry( $cache_key );

					if ( $cached_variation_images ) {
						$cached_images = array_merge( $cached_images, $cached_variation_images );
					}
				}
			}

			if ( $cached_images ) {
				foreach ( $cached_images as $image_data ) {
					if ( ! empty( $image_data['media_embed'] ) ) {
						$found_embed = true;
						break;
					}
				}

				$enqueue_plyr = $found_embed;
			}
		}

		if ( $enqueue_plyr ) {
			if ( ! wp_script_is( 'plyr', 'enqueued' ) ) {
				$this->load_file( 'plyr', '/assets/vendor/plyr.css' );
				$this->load_file( 'plyr', '/assets/vendor/plyr.min.js', true );
			}
		}
	}

	/**
	 * Enqueue hoverIntent
	 */
	public function enqueue_hoverintent() {
		if ( $this->settings['zoom_general_enable'] ) {
			if ( ! wp_script_is( 'hoverIntent', 'enqueued' ) ) {
				$this->load_file( 'hoverIntent', '/assets/vendor/jquery.hoverIntent.min.js', true );
			}
		}
	}

	/**
	 * Helper: Maybe enable fullscreen
	 */
	public function maybe_enable_fullscreen() {
		global $post, $jckqv;

		return apply_filters(
			'iconic_woothumbs_enable_fullscreen',
			(
			$this->settings['fullscreen_general_enable'] ||
			Iconic_WooThumbs_Product::get_setting( $post->ID, 'video_url' ) ||
			$jckqv
			)
		);
	}

	/**
	 * Frontend: Add dynamic CSS to wp_head
	 */
	public function dynamic_css() {
		include $this->plugin_path . 'assets/frontend/css/dynamic-styles.css.php';
	}

	/**
	 * Helper: register and enqueue a file
	 *
	 * @param string $handle
	 * @param string $file_path
	 * @param bool   $is_script
	 * @param array  $deps
	 */
	private function load_file( $handle, $file_path, $is_script = false, $deps = array( 'jquery' ) ) {
		$url  = plugins_url( $file_path, __FILE__ );
		$file = plugin_dir_path( __FILE__ ) . $file_path;

		if ( file_exists( $file ) ) {
			if ( $is_script ) {
				wp_register_script( $handle, $url, $deps, filemtime( plugin_dir_path( __FILE__ ) . $file_path ), true ); // depends on jquery.
				wp_enqueue_script( $handle );
			} else {
				wp_register_style( $handle, $url, array(), filemtime( plugin_dir_path( __FILE__ ) . $file_path ) );
				wp_enqueue_style( $handle );
			}
		}
	}

	/**
	 * Helper: Allow to remove method for a hook when it's a class method used
	 *
	 * @param string $hook_name   Name of the WordPress hook
	 * @param string $class_name  Name of the class where the add_action resides
	 * @param string $method_name Name of the method to unhook
	 * @param int    $priority    The priority of which the above method has in the add_action
	 *
	 * @return bool
	 */
	public function remove_filters_for_anonymous_class( $hook_name = '', $class_name = '', $method_name = '', $priority = 0 ) {
		global $wp_filter;

		// Take only filters on right hook name and priority
		if ( ! isset( $wp_filter[ $hook_name ][ $priority ] ) || ! is_array( $wp_filter[ $hook_name ][ $priority ] ) ) {
			return false;
		}

		// Loop on filters registered
		foreach ( (array) $wp_filter[ $hook_name ][ $priority ] as $unique_id => $filter_array ) {
			// Test if filter is an array ! (always for class/method)
			if ( isset( $filter_array['function'] ) && is_array( $filter_array['function'] ) ) {
				// Test if object is a class, class and method is equal to param !
				if ( is_object( $filter_array['function'][0] ) && get_class( $filter_array['function'][0] ) && get_class( $filter_array['function'][0] ) == $class_name && $filter_array['function'][1] == $method_name ) {
					unset( $wp_filter[ $hook_name ][ $priority ][ $unique_id ] );
				}
			}
		}

		return false;
	}

	/**
	 * Helper: Get default variaiton ID
	 *
	 * Grabs the default variation ID, depending on the
	 * settings for that particular product
	 *
	 * @return int
	 */
	public function get_default_variation_id() {
		global $product;

		if ( ! $product ) {
			return false;
		}

		$product_id           = $product->get_id();
		$default_variation_id = $product_id;
		$caching_enabled      = $this->cache_class()::is_caching_enabled();
		$cache_key_name       = $this->cache_class()::get_cache_key_name( $product_id, 'dvi' );
		$cache_data           = ( $caching_enabled ) ? $this->cache_class()::get_cache_entry( $cache_key_name ) : false;

		if ( ! $cache_data || $cache_data !== $default_variation_id ) {
			if ( 'variable' === $product->get_type() ) {
				$default_attributes = self::get_variation_default_attributes( $product );

				if ( ! empty( $default_attributes ) ) {
					$variation_id = Iconic_WooThumbs_Product::find_matching_product_variation( $product, $default_attributes );

					if ( ! empty( $variation_id ) ) {
						$default_variation_id = $variation_id;
					}
				}
			}

			if ( $caching_enabled ) {
				$this->cache_class()::set_cache_entry( $cache_key_name, $default_variation_id );
			}
		}

		return $default_variation_id;
	}

	/**
	 * Get variation default attributes
	 *
	 * @param WC_Product $product
	 *
	 * @return bool|array
	 */
	public static function get_variation_default_attributes( $product ) {
		if ( method_exists( $product, 'get_default_attributes' ) ) {
			return $product->get_default_attributes();
		} else {
			return $product->get_variation_default_attributes();
		}
	}

	/**
	 * Helper: Get attributes from query string
	 */
	public function get_atts_from_query_string() {
		$atts = array();

		if ( isset( $_GET ) ) {
			foreach ( $_GET as $key => $value ) {
				if ( strpos( $key, 'attribute_' ) !== false ) {
					$atts[ $key ] = $value;
				}
			}
		}

		return $atts;
	}

	/**
	 * Helper: Get default attributes for variable product
	 *
	 * @param int $product_id
	 *
	 * @return array
	 */
	public function get_default_atts( $product_id ) {
		$atts = array();

		$parent_product_id = wp_get_post_parent_id( $product_id );
		$parent_product_id = $parent_product_id === 0 ? $product_id : $parent_product_id;
		$variable_product  = wc_get_product( $parent_product_id );

		if ( $variable_product->get_type() !== 'variable' ) {
			return $atts;
		}

		$default_atts = self::get_variation_default_attributes( $variable_product );

		if ( ! $default_atts ) {
			return $atts;
		}

		foreach ( $default_atts as $key => $value ) {
			$atts[ 'attribute_' . $key ] = $value;
		}

		return $atts;
	}

	/**
	 * Helper: WPML - Get original variation ID
	 *
	 * If WPML is active and this is a translated variaition, get the original ID.
	 *
	 * @param int $id
	 *
	 * @return int
	 */
	public function wpml_get_original_variation_id( $id ) {
		$wpml_original_variation_id = get_post_meta( $id, '_wcml_duplicate_of_variation', true );

		if ( $wpml_original_variation_id ) {
			$id = $wpml_original_variation_id;
		}

		return $id;
	}

	/**
	 * Helper: Get translated media ID
	 *
	 * @param int $media_file_id
	 *
	 * @return bool|int
	 */
	public static function get_translated_media_id( $media_file_id ) {
		$media_file_id = apply_filters( 'wpml_object_id', $media_file_id, 'attachment', true );

		return $media_file_id;
	}

	/**
	 * Helper: Get image data
	 *
	 * @param array $image
	 * @param int   $index
	 * @param array
	 *
	 * @return array
	 */
	public static function get_image_loop_data( $image, $index, $data_lazy = true ) {
		$placeholder_img = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

		// If the media attachment image is missing, return a basic placeholder image.
		if ( ! $image || ! is_array( $image ) ) {
			return array(
				'src'   => $placeholder_img,
				'class' => 'iconic-woothumbs-images__image',
			);
		}

		$srcset = ! empty( $image['srcset'] ) ? $image['srcset'] : false;
		$sizes  = ! empty( $image['sizes'] ) ? $image['sizes'] : false;

		$image_data = array(
			'class'                   => 'iconic-woothumbs-images__image',
			'data-large_image'        => ! empty( $image['large_src_w'] ) ? $image['large_src'] : false,
			'data-large_image_width'  => ! empty( $image['large_src_w'] ) ? $image['large_src_w'] : false,
			'data-large_image_height' => ! empty( $image['large_src_w'] ) ? $image['large_src_h'] : false,
			'title'                   => ! empty( $image['title'] ) ? $image['title'] : false,
			'alt'                     => ! empty( $image['alt'] ) ? $image['alt'] : false,
			'width'                   => ! empty( $image['src_w'] ) ? $image['src_w'] : false,
			'height'                  => ! empty( $image['src_h'] ) ? $image['src_h'] : false,
			'data-caption'            => ! empty( $image['caption'] ) ? $image['caption'] : false,
			'loading'                 => ( ! $data_lazy ) ? 'lazy' : '',
		);

		if ( $data_lazy ) {
			// Slider.
			$image_data['src']         = ( 0 === $index ) ? $image['src'] : $placeholder_img;
			$image_data['srcset']      = ( 0 === $index ) ? $srcset : '';
			$image_data['data-lazy']   = ( 0 === $index ) ? '' : $image['src'];
			$image_data['data-srcset'] = $srcset;
			$image_data['data-sizes']  = $sizes;
			$image_data['class']       = $image_data['class'] . ' no-lazyload skip-lazy';
		} else {
			// Stacked.
			$image_data['src']    = $image['src'];
			$image_data['srcset'] = $srcset;
			$image_data['sizes']  = $sizes;
		}

		// Slides containing <script> tags, such as those modified by
		// Product Configurator should not have any inline aspect ratio.
		$slide_has_script    = ( ! empty( $image['media_embed'] ) && false !== strpos( $image['media_embed'], '<script' ) );
		$image_data['style'] = ( ! $slide_has_script ) ? 'aspect-ratio: ' . str_replace( ':', '/', $image['aspect'] ) . ';' : '';

		$image_data = array_filter( $image_data );

		/**
		 * Filter
		 *
		 * @param $array $image_data Array of image data for the front-end.
		 * @param $image $image      Array of source image data.
		 * @param int    $index      Index of this image in the available images.
		 *
		 * @return array
		 */
		return apply_filters( 'iconic_woothumbs_image_loop_data', $image_data, $image, $index );
	}

	/**
	 * Helper: Array to HTML Attributes
	 */
	public static function array_to_html_atts( $array ) {
		if ( ! is_array( $array ) || empty( $array ) ) {
			return false;
		}

		$return = '';

		foreach ( $array as $key => $value ) {
			if ( empty( $value ) ) {
				continue;
			}

			$return .= sprintf( '%s="%s" ', $key, esc_attr( $value ) );
		}

		return $return;
	}

	/**
	 * Helper: Get the loading overlay HTML
	 */
	public static function get_loading_overlay() {
		ob_start();
		?>
		<div class="iconic-woothumbs-loading-overlay">
			<div class="iconic-woothumbs-loading-overlay--inner">
				<?php Iconic_WooThumbs_Icons::get_svg_icon( 'loading' ); ?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Ajax: Get variation by ID
	 */
	public function ajax_get_variation() {
		$response = array(
			'success'   => false,
			'variation' => false,
		);

		if ( ! empty( $_GET['variation_id'] ) && ! empty( $_GET['product_id'] ) ) {
			$variable_product      = new WC_Product_Variable( absint( $_GET['product_id'] ) );
			$response['success']   = true;
			$response['variation'] = $variable_product->get_available_variation( absint( $_GET['variation_id'] ) );
		}

		// generate the response
		$response['get'] = $_GET;

		// response output
		header( 'Content-Type: text/javascript; charset=utf8' );
		header( 'Access-Control-Allow-Origin: *' );
		header( 'Access-Control-Max-Age: 3628800' );
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE' );

		echo htmlspecialchars( $_GET['callback'] ) . '(' . json_encode( $response ) . ')';

		wp_die();
	}

	/**
	 * Frontend: Add YITH Wishlist Icon
	 */
	public function add_yith_wishlist_icon() {
		if (
			( in_array( 'yith-woocommerce-wishlist/init.php', $this->active_plugins ) || in_array( 'yith-woocommerce-wishlist-premium/init.php', $this->active_plugins ) )
		) {
			global $product;

			$default_wishlists = is_user_logged_in() ? YITH_WCWL()->get_wishlists( array( 'is_default' => true ) ) : false;

			if ( ! empty( $default_wishlists ) ) {
				$default_wishlist = $default_wishlists[0]['ID'];
			} else {
				$default_wishlist = false;
			}

			$added        = YITH_WCWL()->is_product_in_wishlist( $product->get_id(), $default_wishlist );
			$wishlist_url = YITH_WCWL()->get_wishlist_url();
			?>

			<div class="iconic-woothumbs-wishlist-buttons 
			<?php
			if ( $added ) {
				echo 'iconic-woothumbs-wishlist-buttons--added';
			}
			?>
			">

				<a
				class="iconic-woothumbs-wishlist-buttons__browse"
				href="<?php echo esc_url( $wishlist_url ); ?>"
				data-iconic-woothumbs-tooltip="<?php esc_attr_e( 'Browse Wishlist', 'iconic-woothumbs' ); ?>">
					<?php Iconic_WooThumbs_Icons::get_svg_icon( 'heart' ); ?>
				</a>

				<a
				href="<?php echo esc_url( add_query_arg( 'add_to_wishlist', $product->get_id() ) ); ?>"
				rel="nofollow" data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
				data-product-type="<?php echo esc_attr( $product->get_type() ); ?>"
				class="iconic-woothumbs-wishlist-buttons__add add_to_wishlist"
				data-iconic-woothumbs-tooltip="<?php esc_attr_e( 'Add to Wishlist', 'iconic-woothumbs' ); ?>"
				>
					<?php Iconic_WooThumbs_Icons::get_svg_icon( 'heart-empty' ); ?>
				</a>

			</div>

			<?php
		}
	}

	/**
	 * Add variation images to the API
	 *
	 * @param array      $product_data
	 * @param WC_Product $product
	 * @param array      $fields
	 * @param object     $server
	 *
	 * @return array
	 */
	public function woocommerce_api_product_response( $product_data, $product, $fields, $server ) {
		if ( ! empty( $product_data['variations'] ) ) {
			foreach ( $product_data['variations'] as $i => $variation ) {
				$product_data['variations'][ $i ]['images'] = Iconic_WooThumbs_Product::get_images( $variation['id'] );
			}
		}

		return $product_data;
	}

	/**
	 * Bulk: Get current bulk page params
	 *
	 * @param array $ignore
	 *
	 * @return array
	 */
	public function get_bulk_parameters( $ignore = array() ) {
		$get = $_GET;

		if ( empty( $get ) ) {
			return $get;
		}

		foreach ( $get as $key => $value ) {
			if ( empty( $value ) ) {
				unset( $get[ $key ] );
			}
		}

		if ( empty( $ignore ) ) {
			return $get;
		}

		foreach ( $ignore as $ignore_key ) {
			unset( $get[ $ignore_key ] );
		}

		return $get;
	}

	/**
	 * Bulk: Output bulk page params
	 *
	 * @param array $ignore
	 */
	public function output_bulk_parameters( $ignore = array() ) {
		$params = $this->get_bulk_parameters( $ignore );

		if ( ! empty( $params ) ) {
			foreach ( $params as $key => $value ) {
				if ( is_string( $value ) ) {
					printf( '<input type="hidden" name="%s" value="%s">', $key, $value );
				}
			}
		}
	}

	/**
	 * Bulk: Get pagination link
	 *
	 * @param int|bool $page_number
	 *
	 * @return string
	 */
	public function get_pagination_link( $page_number = false ) {
		$params = $this->get_bulk_parameters( array( 'paged' ) );

		if ( $page_number ) {
			$params['paged'] = $page_number;
		}

		return sprintf( '?%s', http_build_query( $params ) );
	}

	/**
	 * Declare HPOS compatiblity.
	 *
	 * @since 5.2.2
	 */
	public function declare_hpos_compatibility() {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}

	/**
	 * Exclude CSS files from WP Rocket’s Remove Unused CSS.
	 *
	 * @param array $exclusions Array of CSS exclusions.
	 *
	 * @return array
	 */
	public function exclude_css_from_wprocket_rucss( $exclusions = array() ) {
		$exclusions[] = '/wp-content/plugins/iconic-woothumbs/assets/vendor/plyr.css';
		$exclusions[] = '/wp-content/plugins/woothumbs-premium/assets/vendor/plyr.css';
		$exclusions[] = '/wp-content/plugins/iconic-woothumbs-premium/assets/vendor/plyr.css';

		return $exclusions;
	}

	/**
	 * Don't allow cloning.
	 *
	 * @return void
	 */
	private function __clone() {
	}

	/**
	 * Disable wakeup.
	 *
	 * @throws RuntimeException Thrown when called.
	 *
	 * @return void
	 */
	public function __wakeup(): void {
		throw new RuntimeException( 'method not implemented' );
	}

	/**
	 * Disable sleep.
	 *
	 * @throws RuntimeException Thrown when called.
	 */
	public function __sleep(): array {
		throw new RuntimeException( 'method not implemented' );
	}
}

$iconic_woothumbs_class = Iconic_WooThumbs::instance();
