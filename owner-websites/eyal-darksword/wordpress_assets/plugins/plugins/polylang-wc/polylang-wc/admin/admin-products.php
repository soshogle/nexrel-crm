<?php

/**
 * Manages the products on admin side (interface)
 *
 * @since 0.1
 */
class PLLWC_Admin_Products {
	/**
	 * Product language data store
	 *
	 * @var object
	 */
	protected $data_store;

	/**
	 * Constructor
	 *
	 * @since 0.1
	 */
	public function __construct() {
		$this->data_store = PLLWC_Data_Store::load( 'product_language' );

		// Ajax
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
		add_action( 'wp_ajax_product_lang_choice', array( $this, 'product_lang_choice' ) );

		// Ajax product ordering
		if ( in_array( 'menu_order', PLL()->options['sync'] ) ) {
			add_action( 'woocommerce_after_product_ordering', array( $this, 'product_ordering' ), 10, 2 );
		}

		// Autocomplete ajax products search
		add_filter( 'woocommerce_json_search_found_products', array( $this, 'search_found_products' ) );
		add_filter( 'woocommerce_json_search_found_grouped_products', array( $this, 'search_found_products' ) );

		// Search in Products list table
		add_filter( 'pll_filter_query_excluded_query_vars', array( $this, 'fix_products_search' ), 10, 2 ); // Since Polylang 2.3.5

		// Don't apply German and Danish specific sanitization for product attributes titles
		$specific_locales = array( 'da_DK', 'de_DE', 'de_DE_formal', 'de_CH', 'de_CH_informal' );
		if ( array_intersect( PLL()->model->get_languages_list( array( 'fields' => 'locale' ) ), $specific_locales ) ) {
			add_action( 'wp_ajax_woocommerce_load_variations', array( $this, 'remove_sanitize_title' ), 5 );
			add_action( 'woocommerce_product_write_panel_tabs', array( $this, 'remove_sanitize_title' ), 5 );
			add_action( 'woocommerce_product_data_panels', array( $this, 'add_sanitize_title' ), 5 );
		}
	}

	/**
	 * Setups the js script (only on the products page)
	 *
	 * @since 0.1
	 */
	public function admin_enqueue_scripts() {
		$screen = get_current_screen();
		if ( ! empty( $screen ) && 'post' === $screen->base && 'product' === $screen->post_type ) {
			$suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
			wp_enqueue_script( 'pllwc_product', plugins_url( '/js/product' . $suffix . '.js', PLLWC_FILE ), 0, PLLWC_VERSION, 1 );
		}
	}

	/**
	 * Ajax response for changing the language in the product language metabox
	 *
	 * @since 0.1
	 */
	public function product_lang_choice() {
		check_ajax_referer( 'pll_language', '_pll_nonce' );

		if ( isset( $_POST['post_id'], $_POST['lang'], $_POST['attributes'] ) ) {
			$post_id    = (int) $_POST['post_id'];
			$lang       = PLL()->model->get_language( sanitize_key( $_POST['lang'] ) );
			$attributes = array_map( 'sanitize_title', wp_unslash( $_POST['attributes'] ) );

			$supplemental = array();

			$x = new WP_Ajax_Response();

			// Attributes (taxonomies of select type)
			foreach ( wc_get_attribute_taxonomies() as $a ) {
				$taxonomy = wc_attribute_taxonomy_name( $a->attribute_name );
				if ( 'select' === $a->attribute_type && false !== $i = array_search( $taxonomy, $attributes ) ) {
					$out = '';
					$all_terms = get_terms( $taxonomy, array( 'orderby' => 'name', 'hide_empty' => 0, 'lang' => $lang->slug ) );

					if ( $all_terms ) {
						foreach ( $all_terms as $term ) {
							$out .= sprintf(
								'<option value="%s" %s>%s</option>',
								esc_attr( $term->slug ),
								selected( has_term( absint( $term->term_id ), $taxonomy, $post_id ), true, false ),
								esc_html( $term->name )
							);
						}
					}

					$supplemental[ 'value-' . $i ] = $out;
				}
			}

			if ( ! empty( $supplemental ) ) {
				$x->Add( array( 'what' => 'attributes', 'supplemental' => $supplemental ) );
			}

			$x->send();
		}
	}

	/**
	 * Synchronize product ordering
	 *
	 * @since 1.0
	 *
	 * @param int   $id          Product id.
	 * @param array $menu_orders An array with product ids as key and menu_order as value.
	 */
	public function product_ordering( $id, $menu_orders ) {
		$language = $this->data_store->get_language( $id );
		foreach ( $menu_orders as $id => $order ) {
			if ( $this->data_store->get_language( $id ) === $language ) {
				foreach ( $this->data_store->get_translations( $id ) as $tr_id ) {
					if ( $id !== $tr_id ) {
						$this->data_store->save_product_ordering( $tr_id, $order );
					}
				}
			}
		}
	}

	/**
	 * Filter the products per language in autocomplete ajax searches
	 *
	 * @since 0.1
	 *
	 * @param array $products array with product ids as keys and names as values.
	 * @return array
	 */
	public function search_found_products( $products ) {
		// Either we are editing a product or an order
		if ( ! isset( $_REQUEST['pll_post_id'] ) || ! $lang = $this->data_store->get_language( (int) $_REQUEST['pll_post_id'] ) ) {  // phpcs:ignore WordPress.Security.NonceVerification
			$lang = PLLWC_Admin::get_preferred_language();
		}

		foreach ( array_keys( $products ) as $id ) {
			if ( $this->data_store->get_language( $id ) !== $lang ) {
				unset( $products[ $id ] );
			}
		}

		return $products;
	}

	/**
	 * Fix search in Products list table
	 * Necessary since WC 3.3.1 as the query uses 'post__in'
	 * which is usually excluded from the language filter
	 *
	 * @since 1.0
	 *
	 * @param array  $excludes Query vars excluded from the language filter.
	 * @param object $query    WP Query object.
	 * @return array
	 */
	public function fix_products_search( $excludes, $query ) {
		if ( ! empty( $query->query['product_search'] ) ) {
			$excludes = array_diff( $excludes, array( 'post__in' ) );
		}
		return $excludes;
	}

	/**
	 * Remove the German and Danish specific sanitization for titles
	 *
	 * @since 0.7.1
	 */
	public function remove_sanitize_title() {
		remove_filter( 'sanitize_title', array( PLL()->filters, 'sanitize_title' ), 10, 3 );
	}

	/**
	 * Add the German and Danish specific sanitization for titles
	 *
	 * @since 0.7.1
	 */
	public function add_sanitize_title() {
		add_filter( 'sanitize_title', array( PLL()->filters, 'sanitize_title' ), 10, 3 );
	}
}
