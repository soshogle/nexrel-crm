<?php
/**
 * Template: Popup Slides.
 *
 * @package iconic-onboard
 */

?>
<div style="display:none;">
	<div id="iconic-onboard-modal" class="iconic-onboard-modal <?php echo esc_attr( $modal_class ); ?>">
		<form action="" class="iconic-onboard-modal__form">
			<div class="iconic-onboard-modal__slides">
				<?php
				$index = 0;
				foreach ( $slides as $slide_index => $slide ) {
					$slide       = wp_parse_args( $slide, $defaults );
					$action_data = array(
						'slide_index' => $index,
						'slide'       => $slide,
						'plugin_slug' => $plugin_slug,
					);
					$is_first    = 0 === $index;
					$is_last     = count( $slides ) - 1 === $index;
					$has_fields  = ! empty( $slide['fields'] );

					$slide_class  = array();
					$button_class = array(
						$is_last ? 'iconic-onboard-modal__submit ' : 'iconic-onboard-modal__nextslide ',
					);

					if ( ! empty( $slide['button_class'] ) ) {
						$button_class[] = $slide['button_class'];
					}

					if ( ! empty( $slide['wait'] ) ) {
						$slide_class[]              = 'iconic-onboard-modal__slide--wait';
						$button_class[]             = 'iconic-onboard-modal__button--wait';
						$slide['json_data']['wait'] = $slide['wait'];
					}
					?>
					<!-- slide starts -->
					<div class="iconic-onboard-modal__slide iconic-onboard-modal__slide_<?php echo esc_attr( $index + 1 ); ?> iconic-onboard-modal__slide--<?php echo esc_attr( $slide_index ); ?> <?php echo esc_attr( implode( ' ', $slide_class ) ); ?>" data-slide-index="<?php echo esc_attr( $slide_index ); ?>">
						<?php do_action( "iconic_onboard_{$plugin_slug}_slide_before_header", $action_data ); ?>

						<?php if ( ! empty( $slide['header_image'] ) ) { ?>
							<div class="iconic-onboard-modal__header" style="background-image: url( '<?php echo esc_url( $slide['header_image'] ); ?>' );">
								<?php do_action( "iconic_onboard_{$plugin_slug}_slide_header", $action_data ); ?>
							</div>
						<?php } ?>

						<div class="iconic-onboard-modal__body" style="text-align:center;">
							<?php do_action( "iconic_onboard_{$plugin_slug}_slide_body_starts", $action_data ); ?>

							<h2><?php echo esc_html( $slide['title'] ); ?></h2>

							<?php echo wp_kses_post( apply_filters( 'the_content', $slide['description'] ) ); ?>

							<?php if ( $has_fields ) { ?>
								<div class="iconic-onboard-modal-setting">
									<?php do_action( "iconic_onboard_{$plugin_slug}_slide_settings", $action_data ); ?>
								</div>
							<?php } ?>

							<a href="#" class="button button-large button-primary iconic-onboard-modal__button <?php echo esc_attr( implode( ' ', $button_class ) ); ?>">
								<?php
								$kses_args = array(
									'span' => array(
										'class' => array(),
										'style' => array(),
									),
								);
								echo wp_kses( strip_tags( $slide['button_text'], '<span>' ), $kses_args );
								?>
								<div class="iconic-onboard-modal__loader"><?php esc_html_e( 'Loading...', 'iconic-onboard' ); ?></div>
							</a>

							<?php if ( ! empty( $slide['json_data'] ) ) { ?>
								<script type="application/json" id="iconic-onboard-modal-slide-json-data-<?php echo esc_attr( $slide_index ); ?>">
									<?php echo json_encode( $slide['json_data'] ); ?>

								</script>
							<?php } ?>

							<?php do_action( "iconic_onboard_{$plugin_slug}_slide_after_button", $action_data ); ?>
						</div>

						<?php do_action( "iconic_onboard_{$plugin_slug}_slide_end", $action_data ); ?>
					</div>
					<!-- slide ends -->
					<?php
					$index ++;
				}
				?>
			</div> <!-- .iconic-onboard-modal__slides -->
		</form>

		<?php if ( ! $disable_skip ) { ?>
			<div class="iconic-onboard-modal__dismiss">
				<a href="#" class="iconic-onboard-modal__dismiss_a"><?php esc_html_e( "Skip this, I'll set it up later.", 'iconic-onboard' ); ?> </a>
			</div>
		<?php } ?>
	</div> <!-- .iconic-onboard-modal -->
</div>
