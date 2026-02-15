<?php

/*
Class Name: WOOMULTI_CURRENCY_Admin_Admin
Author: Andy Ha (support@villatheme.com)
Author URI: http://villatheme.com
Copyright 2015 villatheme.com. All rights reserved.
*/
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Admin_Admin {
	protected $settings;

	function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();;
		add_filter( 'plugin_action_links_woocommerce-multi-currency/woocommerce-multi-currency.php', array(
			$this,
			'settings_link'
		) );
		add_action( 'init', array( $this, 'init' ) );
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		//		add_action( 'admin_notices', array( $this, 'multiple_currency_switcher_plugins_active' ) );
		//		add_action( 'admin_notices', array( $this, 'cache_plugins_note' ) );
		add_action( 'admin_menu', array( $this, 'menu_page' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ), 99 );
		add_filter( 'woocommerce_general_settings', array( $this, 'woocommerce_general_settings' ) );

	}

	public function multiple_currency_switcher_plugins_active() {
		global $pagenow;
		if ( is_plugin_active( 'woocommerce-currency-switcher/index.php' ) || is_plugin_active( 'woocommerce-multicurrency/woocommerce-multicurrency.php' ) || is_plugin_active( 'currency-switcher-woocommerce/currency-switcher-woocommerce.php' ) ) {
			?>
            <div class="notice notice-warning">
                <p>
					<?php
					if ( $pagenow === 'plugins.php' ) {
						echo esc_html__( '<strong>WooCommerce Multi Currency:</strong> Some other currency switcher plugins are also active which may cause conflict and may make WooCommerce Multi Currency plugin work incorrectly.', 'woocommerce-multi-currency' );
					} else {
						echo esc_html__( '<strong>WooCommerce Multi Currency:</strong> Some other currency switcher plugins are also active which may cause conflict and may make WooCommerce Multi Currency plugin work incorrectly, please go to <a target="_blank" href="plugins.php">plugins</a> to deactivate them.', 'woocommerce-multi-currency' );
					}
					?>
                </p>
            </div>
			<?php
		}
	}

	public function cache_plugins_note() {
		if ( isset( $_GET['wmc_admin_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_GET['wmc_admin_nonce'] ) ), 'wmc_admin_nonce' ) ) {
		    return;
        }
		$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';
		if ( $page != 'woocommerce-multi-currency' ) {
			return;
		}
		if ( is_plugin_active( 'wp-super-cache/wp-cache.php' ) && ! is_plugin_active( 'country-caching-extension-for-wp-super-cache/cc_wpsc_init.php' ) ) { ?>
            <div class="notice notice-warning">
                <div class="villatheme-content">
                    <p>
						<?php echo esc_html__( 'You are using <strong>WP Super Cache</strong>. Please install and active <strong>Country Caching For WP Super Cache</strong> that helps <strong>WooCommerce Multi Currency</strong> is working fine with WP Super Cache.', 'woocommerce-multi-currency' ) ?>
                    </p>
                </div>
            </div>
		<?php }

		if ( is_plugin_active( 'wp-fastest-cache/wpFastestCache.php' ) ) {
			if ( defined( 'WPFC_CACHE_QUERYSTRING' ) && WPFC_CACHE_QUERYSTRING ) {
				return;
			}
			?>
            <div class="notice notice-warning">

                <div class="villatheme-content">
                    <p>
						<?php echo esc_html__( 'You are using <strong>WP Fastest Cache</strong>. Please make follow these steps these help <strong>WooCommerce Multi Currency</strong> is working fine with WP Fastest Cache.', 'woocommerce-multi-currency' ) ?>
                    </p>
                    <ul>
                        <li><?php echo esc_html__( '1. In <strong>WooCommerce → Settings → General → Default customer location</strong> make sure you have selected: <strong>Geolocate with page caching support</strong>', 'woocommerce-multi-currency' ) ?></li>
                        <li><?php echo esc_html__( '2. Open wp-config.php file via FTP then insert <strong>define(\'WPFC_CACHE_QUERYSTRING\', true);</strong>', 'woocommerce-multi-currency' ) ?></li>
                    </ul>

                </div>

            </div>
		<?php }
	}


	/**
	 * Remove currency, decimal, posistion, setting in backend
	 *
	 * @param $datas
	 *
	 * @return mixed
	 */
	public function woocommerce_general_settings( $datas ) {
		foreach ( $datas as $k => $data ) {
			if ( isset( $data['id'] ) ) {
				if ( $data['id'] == 'woocommerce_currency' || $data['id'] == 'woocommerce_price_num_decimals' || $data['id'] == 'woocommerce_currency_pos' ) {
					if ( ! wp_is_mobile() ) {
						unset( $datas[ $k ] );
					}
				}
				if ( $data['id'] == 'pricing_options' ) {
					$datas[ $k ]['desc'] = esc_html__( 'The following options affect how prices are displayed on the frontend. Woo Multi Currency is working. Please go to ', 'woocommerce-multi-currency' ) . '<a href="' . admin_url( '?page=woocommerce-multi-currency' ) . '">' . esc_html__( 'WooCommerce Multi Currency setting page', 'woocommerce-multi-currency' ) . '</a>' . esc_html__( ' to set default currency.', 'woocommerce-multi-currency' );
				}
			}
		}

		return $datas;
	}

	/*Check Auto update*/
	public function admin_init() {
		$old_data = get_option( 'wmc_selected_currencies', array() );
		if ( count( $old_data ) ) {
			$currency         = $currency_rate = $currency_decimals = $currency_custom = $currency_pos = array();
			$currency_default = '';
			$by_countries     = json_decode( get_option( 'wmc_currency_by_country', array() ), true );

			/*Move Data Currency*/

			foreach ( $old_data as $k => $data ) {
				if ( $data['is_main'] == 1 ) {
					$currency_default = $k;
				}
				$currency[]          = $k;
				$currency_rate[]     = $data['rate'];
				$currency_decimals[] = $data['num_of_dec'];
				$currency_pos[]      = $data['pos'];
				if ( strpos( $data['custom_symbol'], '#PRICE#' ) === false ) {
					$currency_custom[] = '';
				} else {
					$currency_custom[] = $data['custom_symbol'];
				}
			}
			$by_country_args = array();
			/*Move Data Currency By Country*/
			foreach ( $by_countries as $code => $by_country ) {
				$by_country_args[ $code . '_by_country' ] = $by_country;
			}
			/*Move Key data*/
			if ( get_option( 'wmc_oder_id' ) && get_option( 'wmc_email' ) ) {
				$key = trim( get_option( 'wmc_oder_id' ) ) . ',' . trim( get_option( 'wmc_email' ) );
			} else {
				$key = '';
			}

			$args = array(
				'enable'                     => 1,
				'enable_fixed_price'         => 0,
				'currency_default'           => $currency_default,
				'currency'                   => $currency,
				'currency_rate'              => $currency_rate,
				'currency_decimals'          => $currency_decimals,
				'currency_custom'            => array(),
				'currency_pos'               => $currency_pos,
				'auto_detect'                => get_option( 'wmc_enable_approxi' ) ? get_option( 'wmc_enable_approxi' ) : 0,
				'enable_currency_by_country' => get_option( 'wmc_price_by_currency' ) == 'yes' ? 1 : 0,
				'enable_multi_payment'       => get_option( 'wmc_allow_multi' ) == 'yes' ? 1 : 0,
				'key'                        => $key,
				'update_exchange_rate'       => get_option( 'wmc_price_by_currency' ) == 'yes' ? 2 : 0,
				'enable_design'              => 0,
				'title'                      => '',
				'design_position'            => 0,
				'text_color'                 => '#fff',
				'background_color'           => '#212121',
				'main_color'                 => '#f78080',
				'flag_custom'                => ''
			);

			$args = array_merge( $args, $by_country_args );
			update_option( 'woo_multi_currency_params', $args );
			update_option( 'woo_multi_currency_old_version', 1 );
			delete_option( 'wmc_selected_currencies' );
		}
		/*Set currency again in backend*/
		if ( ! wp_doing_ajax() ) {
			$frontend_call_admin = false;
			//Fix with Jetpack stats request from frontend
			if ( ! isset( $_GET['wmc_admin_nonce'] ) || wp_verify_nonce( wc_clean( wp_unslash( $_GET['wmc_admin_nonce'] ) ), 'wmc_admin_nonce' ) ) {
                if ( isset( $_GET['page'], $_GET['chart'] ) && $_GET['page'] === 'stats' && in_array( $_GET['chart'], array(
                        'admin-bar-hours-scale',
                        'admin-bar-hours-scale-2x'
                    ) ) ) {
                    $frontend_call_admin = true;
                }
                if ( ! $frontend_call_admin && current_user_can( 'manage_woocommerce' ) ) {
                    $current_currency = get_option( 'woocommerce_currency' );
                    $this->settings->set_current_currency( $current_currency );
                }
			}
		}
		//		$params = new WOOMULTI_CURRENCY_Data();
		$params = WOOMULTI_CURRENCY_Data::get_ins();

		/*Check update*/
		$key         = $params->get_key();
		$setting_url = admin_url( '?page=woocommerce-multi-currency' );

		new VillaTheme_Plugin_Check_Update ( WOOMULTI_CURRENCY_VERSION,                    // current version
			'https://villatheme.com/wp-json/downloads/v3',  // update path
			'woocommerce-multi-currency/woocommerce-multi-currency.php',                  // plugin file slug
			'woocommerce-multi-currency', '5455', $key, $setting_url );
		new VillaTheme_Plugin_Updater( 'woocommerce-multi-currency/woocommerce-multi-currency.php', 'woocommerce-multi-currency', $setting_url );
	}


	/**
	 * Init Script in Admin
	 */
	public function admin_enqueue_scripts() {
		if ( isset( $_GET['wmc_admin_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_GET['wmc_admin_nonce'] ) ), 'wmc_admin_nonce' ) ) {
		    return;
        }
		$page = isset( $_REQUEST['page'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['page'] ) ) : '';
		if ( $page == 'woocommerce-multi-currency' ) {
			global $wp_scripts;
			$scripts = $wp_scripts->registered;
			foreach ( $scripts as $k => $script ) {
				if ( $script->handle == 'query-monitor' ) {
					continue;
				}
				preg_match( '/^\/wp-/i', $script->src, $result );
				if ( count( array_filter( $result ) ) < 1 ) {
					wp_dequeue_script( $script->handle );
				}
			}
			$src_min = WP_DEBUG ? '' : '.min';
			wp_dequeue_style( 'eopa-admin-css' );
			/*Stylesheet*/
			wp_enqueue_style( 'woocommerce-multi-currency-button', WOOMULTI_CURRENCY_CSS . 'button.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-table', WOOMULTI_CURRENCY_CSS . 'table.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-transition', WOOMULTI_CURRENCY_CSS . 'transition.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-form', WOOMULTI_CURRENCY_CSS . 'form.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-icon', WOOMULTI_CURRENCY_CSS . 'icon.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-dropdown', WOOMULTI_CURRENCY_CSS . 'dropdown.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-checkbox', WOOMULTI_CURRENCY_CSS . 'checkbox.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-segment', WOOMULTI_CURRENCY_CSS . 'segment.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-menu', WOOMULTI_CURRENCY_CSS . 'menu.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-tab', WOOMULTI_CURRENCY_CSS . 'tab.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-input', WOOMULTI_CURRENCY_CSS . 'input.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-popup', WOOMULTI_CURRENCY_CSS . 'popup.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-message', WOOMULTI_CURRENCY_CSS . 'message.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-accordion', WOOMULTI_CURRENCY_CSS . 'accordion.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-progress', WOOMULTI_CURRENCY_CSS . 'progress.min.css', [], WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_CSS . 'woocommerce-multi-currency-admin' . $src_min . '.css', '', WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'select2', WOOMULTI_CURRENCY_CSS . 'select2.min.css', [], WOOMULTI_CURRENCY_VERSION );

			wp_enqueue_script( 'select2' );
			wp_enqueue_script( 'woocommerce-multi-currency-transition', WOOMULTI_CURRENCY_JS . 'transition.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-dropdown', WOOMULTI_CURRENCY_JS . 'dropdown.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-checkbox', WOOMULTI_CURRENCY_JS . 'checkbox.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-tab', WOOMULTI_CURRENCY_JS . 'tab.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-accordion', WOOMULTI_CURRENCY_JS . 'accordion.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-progress', WOOMULTI_CURRENCY_JS . 'progress.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'woocommerce-multi-currency-address', WOOMULTI_CURRENCY_JS . 'jquery.address-1.6.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_script( 'jquery-ui-sortable' );
			wp_enqueue_script( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_JS . 'woocommerce-multi-currency-admin' . $src_min . '.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );

			/*Color picker*/
			wp_enqueue_script( 'iris', admin_url( 'js/iris.min.js' ), array(
				'jquery-ui-draggable',
				'jquery-ui-slider',
				'jquery-touch-punch'
			), '1.1.1', 1 );

			//			wp_localize_script( 'woocommerce-multi-currency', 'selectData', array( 'results' => $this->convert_woocommerce_currencies() ) );

		}

	}


	public function convert_woocommerce_currencies() {
		$wc_currencies = get_woocommerce_currencies();
		$new_list      = array();
		foreach ( $wc_currencies as $currency_code => $name ) {
			$new_list[] = array(
				'id'   => $currency_code,
				'text' => $currency_code . '-' . $name . ' (' . get_woocommerce_currency_symbol( $currency_code ) . ')'
			);
		}

		return $new_list;
	}

	/**
	 * Link to Settings
	 *
	 * @param $links
	 *
	 * @return mixed
	 */
	public function settings_link( $links ) {
		$settings_link = '<a href="admin.php?page=woocommerce-multi-currency" title="' . esc_html__( 'Settings', 'woocommerce-multi-currency' ) . '">' . esc_html__( 'Settings', 'woocommerce-multi-currency' ) . '</a>';
		array_unshift( $links, $settings_link );

		return $links;
	}


	/**
	 * Function init when run plugin+
	 */
	public function init() {
		load_plugin_textdomain( 'woocommerce-multi-currency' );
		$this->load_plugin_textdomain();
		if ( class_exists( 'VillaTheme_Support_Pro' ) ) {
			new VillaTheme_Support_Pro(
				array(
					'support'   => 'https://villatheme.com/supports/forum/plugins/woo-multi-currency/',
					'docs'      => 'http://docs.villatheme.com/?item=woo-multi-currency',
					'review'    => 'https://codecanyon.net/downloads',
					'css'       => WOOMULTI_CURRENCY_CSS,
					'image'     => WOOMULTI_CURRENCY_IMAGES,
					'slug'      => 'woocommerce-multi-currency',
					'menu_slug' => 'woocommerce-multi-currency',
					'version'   => WOOMULTI_CURRENCY_VERSION,
				)
			);
		}
	}


	/**
	 * load Language translate
	 */
	public function load_plugin_textdomain() {
		$locale = apply_filters( 'plugin_locale', get_locale(), 'woocommerce-multi-currency' );
		// Global + Frontend Locale
		load_textdomain( 'woocommerce-multi-currency', WOOMULTI_CURRENCY_LANGUAGES . "woocommerce-multi-currency-$locale.mo" );
		load_plugin_textdomain( 'woocommerce-multi-currency', false, WOOMULTI_CURRENCY_LANGUAGES );
	}

	/**
	 * Register a custom menu page.
	 */
	public function menu_page() {
		add_menu_page( esc_html__( 'WooCommerce Multi Currency', 'woocommerce-multi-currency' ), esc_html__( 'Multi Currency', 'woocommerce-multi-currency' ), 'manage_woocommerce', 'woocommerce-multi-currency', array(
			'WOOMULTI_CURRENCY_Admin_Settings',
			'page_callback'
		), WOOMULTI_CURRENCY_IMAGES . 'icon.svg', 2 );

	}

}