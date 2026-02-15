<?php
/** @var  $dropdown_icon */
/** @var  $data_flag_size */
/** @var  $custom_format */
/** @var  $country_code */
/** @var  $flag_size */
/** @var  $symbol */
?>
	<div id="<?php echo esc_attr( $id ) ?>"
	     class="woocommerce-multi-currency wmc-shortcode plain-vertical layout11 <?php echo esc_attr( $class ) ?>"
	     data-layout="layout11" data-flag_size="<?php echo esc_attr( $data_flag_size ) ?>"
	     data-dropdown_icon="<?php echo esc_attr( $dropdown_icon ) ?>"
	     data-custom_format="<?php echo esc_attr( $custom_format ) ?>">
		<input type="hidden" class="wmc-current-url" value="<?php echo esc_attr( $current_url ) ?>">
		<div class="wmc-currency-wrapper">
				<span class="wmc-current-currency" style="line-height: <?php echo esc_attr( $line_height ) ?>">
                   <span>
                    <?php
                    echo "<i style='" . esc_attr( $flag_size ) . "' class='wmc-current-flag vi-flag-64 flag-" . esc_attr( $country_code ) . "'></i>";
                    $display_name = apply_filters( 'wmc_shortcode_currency_display_name', $countries[ $current_currency ], $current_currency );
                    if ( $custom_format ) {
	                    ?>
	                    <span class="<?php echo esc_attr( "wmc-text wmc-text-{$current_currency}" ) ?>">
                            <?php
                            echo str_replace( array(// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	                            '{currency_name}',
	                            '{currency_code}',
	                            '{currency_symbol}'
                            ), array(
	                            '<span class="wmc-currency-name">' . esc_html( $display_name ) . '</span>',
	                            '<span class="wmc-currency-code">' . esc_html( $current_currency ) . '</span>',
	                            '<span class="wmc-currency-symbol">' . esc_html( $symbol ) . '</span>'
                            ), $custom_format );
                            ?>
                        </span>
	                    <?php
                    } else {
	                    echo "<span class='wmc-text wmc-text-" . esc_attr( $current_currency ) . "'>
                                <span class='wmc-text-currency-text'>" . esc_html( $display_name ) . " </span>
                                <span class='wmc-text-currency-symbol'>(" . esc_html( $current_currency ) . ")</span>
                            </span>";
                    }
                    ?>
                    </span>
                    <?php echo $arrow;// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                </span>
			<div class="wmc-sub-currency">
				<?php
				foreach ( $links as $k => $link ) {
					$sub_class = array( 'wmc-currency' );
					if ( $current_currency == $k ) {
						$sub_class[] = 'wmc-hidden';
					}
					$country = $settings->get_country_data( $k );
					?>
					<div class="<?php echo esc_attr( implode( ' ', $sub_class ) ) ?>" data-currency="<?php echo esc_attr( $k ) ?>">
						<?php
						$html = '';
						if ( $settings->enable_switch_currency_by_js() ) {
							$link = '#';
						}

						$symbol = get_woocommerce_currency_symbol( $k );
						$html   .= sprintf( "<a rel='nofollow' class='wmc-currency-redirect' href='%1s' style='line-height:%2s' data-currency='%3s' data-currency_symbol='%4s'>",
							esc_url( $link ), $line_height, $k, $symbol );
						$html   .= sprintf( "<i style='%1s' class='vi-flag-64 flag-%2s'></i>", $flag_size, strtolower( $country['code'] ) );

						$s_display_name = apply_filters( 'wmc_shortcode_currency_display_name', $countries[ $k ], $k );
						if ( $custom_format ) {
							$html .= '<span>' . str_replace(
									[
										'{currency_name}',
										'{currency_code}',
										'{currency_symbol}'
									],
									[
										'<span class="wmc-sub-currency-name">' . esc_html( $s_display_name ) . '</span>',
										'<span class="wmc-sub-currency-code">' . esc_html( $k ) . '</span>',
										'<span class="wmc-sub-currency-symbol">' . esc_html( $symbol ) . '</span>'
									], $custom_format ) . '</span>';
						} else {
							$html .= sprintf( "<span class='wmc-sub-currency-name'>%1s</span>", esc_html( $s_display_name ) );
							$html .= sprintf( "<span class='wmc-sub-currency-symbol'>(%1s)</span>", esc_html( $k ) );
						}
						$html .= '</a>';
						echo $html;// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
						?>
					</div>
					<?php
				}
				?>
			</div>
		</div>
	</div>
<?php