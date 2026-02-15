<?php
/** @var  $layout */
/** @var  $currencies */
/** @var  $st_currencies */
/** @var  $current_currency */
/** @var  $price_convert */
/** @var  $price_range */
/** @var  $rates */
/** @var  $title */
/** @var  $class */
/** @var  $current_url */
/** @var  $settings */

?>
    <div class="wmc-shortcode-price-collate wmc-shortcode-price-collate-layout-<?php echo esc_attr( $layout ) ?> <?php echo esc_attr( $class ) ?>"
         data-layout="<?php echo esc_attr( $layout ) ?>" data-url="<?php echo esc_attr( $current_url ) ?>">
        <div class="wmc-collate-title-wrap"><?php echo esc_html( $title ? $title : '' ); ?></div>
        <div class="wmc-currency-collate-wrapper wmc-collate-layout-<?php echo esc_attr( $layout ) ?>">
			<?php
			$loop_default = false;
			foreach ( $st_currencies as $k => $currency ) {
				$sub_class  = array( 'wmc-collate-item-wrap' );
				$sepa_class = '';
				if ( $currency == $current_currency ) {
					$loop_default = true;
				}
				if ( ! in_array( $currency, $currencies ) ) {
					$sub_class[] = 'wmc-hidden';
				}
				if ( ! isset( $rates[ $currency ] ) || ! isset( $rates[ $current_currency ] ) ) ?>
                    <div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>"
                data-currency="<?php echo esc_attr( $currency ) ?>">
				<?php
				$html = '';
				if ( empty( $price_range ) || ! is_array( $price_range ) ) {
					if ( $currency == $current_currency ) {
						$price_currency = $price_convert;
					} else {
						$price_currency = ( $price_convert * $rates[ $currency ] ) / $rates[ $current_currency ];
					}
					$price_html = wc_price( $price_currency, [ 'currency' => $currency ] );
				} else {
					if ( $currency == $current_currency ) {
						$min_price = (float) $price_range[0];
						$max_price = (float) $price_range[1];
					} else {
						$min_price = ( (float) $price_range[0] * $rates[ $currency ] ) / $rates[ $current_currency ];
						$max_price = ( (float) $price_range[1] * $rates[ $currency ] ) / $rates[ $current_currency ];
					}
					$price_html = sprintf( _x( '%1$s &ndash; %2$s', 'Price range: from-to', 'woocommerce-multi-currency' ), is_numeric( $min_price ) ? wc_price( $min_price, [ 'currency' => $currency ] ) : $min_price, is_numeric( $max_price ) ? wc_price( $max_price, [ 'currency' => $currency ] ) : $max_price );
				}
				$symbol         = get_woocommerce_currency_symbol( $currency );
				$s_display_name = apply_filters( 'wmc_shortcode_currency_display_name', $currency );
				switch ( $layout ) {
					case 'split':
						$html .= sprintf( "<span class='wmc-collate-currency-name'>%1s: </span>", esc_html( $currency ) );
						$html .= sprintf( "<span class='wmc-collate-currency-value'>%1s</span>", wp_kses_post( $price_html ) );
						break;
					default:
						$html .= sprintf( "<span class='wmc-collate-currency-name'>%1s: </span>", esc_html( $currency ) );
						$html .= sprintf( "<span class='wmc-collate-currency-value'>%1s</span>", wp_kses_post( $price_html ) );
//								$html .= sprintf( "<span class='wmc-collate-currency-symbol'>(%1s)</span>", esc_html( $symbol ) );
				}
				echo wp_kses_post( $html );
				switch ( $layout ) {
					case 'split':
						break;
					default:
						if ( $loop_default ) {
							if ( $currency != $current_currency && $k == ( count( $st_currencies ) - 1 ) ) {
								$sepa_class = ' wmc-hidden';
							}
						} else {
							if ( $k == ( count( $st_currencies ) - 2 ) ) {
								switch ( $layout ) {
									case 'split':
										break;
									default:
										$sepa_class = ' wmc-hidden';
								}
							}
						} ?>
                        <span class="wmc-collate-currency-separate-symbol<?php echo esc_attr( $sepa_class ) ?>"><?php echo esc_html( apply_filters( 'wmc_shortcode_collate_separate_symbol', '/' ) ) ?></span>
					<?php } ?>
                </div>
				<?php
			}
			?>
        </div>
    </div>
<?php