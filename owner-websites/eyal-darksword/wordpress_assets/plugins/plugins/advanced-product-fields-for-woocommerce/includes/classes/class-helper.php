<?php

namespace SW_WAPF\Includes\Classes {

    class Helper
    {

	    // WP has a bug in their "wp_slash" function that is only fixed in wp 5.5 so we define our own here.
	    public static function wp_slash($value) {
		    if ( is_array( $value ) ) {
			    $value = array_map( 'self::wp_slash', $value );
		    }
		    if ( is_string( $value ) ) {
			    return addslashes( $value );
		    }
		    return $value;
	    }

        public static function get_all_roles() {

            $roles = get_editable_roles();

            return Enumerable::from($roles)->select(function($role, $id) {
                return [ 'id' => $id,'text' => $role['name'] ];
            })->toArray();
        }

        public static function cpt_to_string($cpt){

            return __('Product','advanced-product-fields-for-woocommerce');

        }

        public static function get_fieldgroup_counts() {

	        $count_cache = [ 'publish' => 0, 'draft' => 0, 'trash' => 0, 'private' => 0 ];

	        foreach(wapf_get_setting('cpts') as $cpt) {
		        $count = wp_count_posts($cpt);
		        $count_cache['publish'] += $count->publish;
		        $count_cache['trash'] += $count->trash;
		        $count_cache['draft'] += $count->draft;
                $count_cache['private'] += $count->private;
	        }

	        $count_cache['all'] = $count_cache['publish'] + $count_cache['draft'];

	        return $count_cache;
        }

        /**
         * Converts an object or array to a string suitable to print in a HTML attribute.
         * @param $thing Object or array
         * @return string
         */
        public static function thing_to_html_attribute_string($thing){

            $encoded = wp_json_encode($thing);
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            return function_exists('wc_esc_json') ? wc_esc_json($encoded) : _wp_specialchars($encoded, ENT_QUOTES, 'UTF-8', true);

        }

        public static function format_pricing_hint($type, $amount, $product, $for_page = 'shop') {

            $display_settings = WooCommerce_Service::get_price_display_options();

            // Convert our pricing display options to standard Woo, so they align for the "wc_price_args" filter.
            $args = apply_filters( 'wc_price_args', [
                'ex_tax_label'       => false,
                'currency'           => '',
                'decimal_separator'  => $display_settings['decimal'],
                'thousand_separator' => $display_settings['thousand'],
                'decimals'           => $display_settings['decimals'],
                'price_format'       => $display_settings['format']
            ] );

            $original_price = $amount;
            $price = (float) $amount;
            $unformatted_price = $price;
            $negative = $price < 0;

            $price = self::maybe_add_tax( $product, $original_price, $for_page );

            $price = apply_filters( 'raw_woocommerce_price', $negative ? $price * -1 : $price, $original_price );
            $price = apply_filters( 'formatted_woocommerce_price', number_format( $price, $args['decimals'], $args['decimal_separator'], $args['thousand_separator'] ), $price, $args['decimals'], $args['decimal_separator'], $args['thousand_separator'], $original_price );
            if ( $display_settings['trimzero'] && $args['decimals'] > 0 ) {
                $price = wc_trim_zeros( $price );
            }

            $formatted_price = ( $negative ? '-' : '' ) . sprintf( $args['price_format'], get_woocommerce_currency_symbol( $args['currency'] ), $price );
            $return = $formatted_price;

            /*if ( $args['ex_tax_label'] && wc_tax_enabled() ) {
                $return .= ' <small class="wqm-tax-label">' . WC()->countries->ex_tax_or_vat() . '</small>';
            } */

            $return = apply_filters( 'wc_price', $return, $price, $args, $unformatted_price, $original_price );

            $sign = '+';

            return sprintf('%s%s',$sign, $return);

        }

        /**
         * Normalize string decimal
         *
         * Changes 'xx.xxx,xx' to 'xxxxx.xx'
         *
         */
        public static function normalize_string_decimal($number)
        {
            return preg_replace('/\.(?=.*\.)/', '', (str_replace(',', '.', $number)));
        }

	    public static function adjust_addon_price($product, $amount,$type,$for = 'shop') {

		    if($amount === 0)
			    return 0;

		    if($type === 'percent' || $type === 'p')
			    return $amount;

		    // Maybe add tax to it.
		    $amount = self::maybe_add_tax($product,$amount,$for);

		    return $amount;

	    }

	    public static function maybe_add_tax( $product, $price, $for_page = 'shop' ) {

		    // Empty or negative
		    if( empty( $price ) || $price < 0 || ! wc_tax_enabled() ) {
                return $price;
            }

		    // Allow id's to be passed in.
		    if( is_int( $product ) ) {
                $product = wc_get_product( $product );
            }

		    $args = [ 'qty' => 1, 'price' => $price ];
            
		    if( $for_page === 'cart' ) {
			    if( get_option( 'woocommerce_tax_display_cart' ) === 'incl' )
				    return wc_get_price_including_tax( $product, $args );
			    else
				    return wc_get_price_excluding_tax( $product, $args );
		    }
		    else {
                return wc_get_price_to_display( $product, $args );
            }

	    }

	    public static function get_product_base_price($product) {

		    return floatval($product->get_price());

		    /*
		    if(wc_prices_include_tax())
			    $price = wc_get_price_including_tax($product);
		    else $price = wc_get_price_excluding_tax($product);

		    return $price;
		    */
	    }

    }
}