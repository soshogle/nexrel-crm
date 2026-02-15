<?php
/**
 * Layout: Slider — Loop main slider images.
 *
 * @var array $args
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( ! empty( $args['images'] ) ) {
	/**
	 * Hook: iconic_woothumbs_before_images_wrap
	 */
	do_action( 'iconic_woothumbs_before_images_wrap' );
	?>

	<div class="iconic-woothumbs-images-wrap">

		<?php
		/**
		 * Hook: iconic_woothumbs_before_images
		 */
		do_action( 'iconic_woothumbs_before_images' );

		$click_anywhere_class = ( $args['fullscreen_general_click_anywhere'] && $args['fullscreen_general_enable'] ) ? 'iconic-woothumbs-images--click-anywhere' : '';
		$container_classes    = array(
			$click_anywhere_class,
		);
		?>

		<div class="iconic-woothumbs-images <?php echo esc_attr( implode( ' ', $container_classes ) ); ?>">

			<?php
			$i = 0;
			foreach ( $args['images'] as $key => $image ) :
				$slide_classes = array(
					'iconic-woothumbs-images__slide',
					'iconic-woothumbs-images__slide-' . esc_attr( $key + 1 ),
				);

				/**
				 * Filter the WooThumbs slide classes.
				 *
				 * @param string[] $slide_classes Array of slide class strings.
				 * @param array    $image         Array of image attributes.
				 * @since 5.5.0
				 */
				$slide_classes = apply_filters( 'iconic_woothumbs_slide_classes', $slide_classes, $image );
				?>
				<div 
				class="<?php echo esc_attr( trim( implode( ' ', $slide_classes ) ) ); ?>"
				data-index="<?php echo esc_attr( $i ); ?>">
					<?php
					/**
					 * Hook: iconic_woothumbs_image
					 */
					do_action( 'iconic_woothumbs_image', $image, $i, $args['images'] );
					?>
				</div>
				<?php
				$i ++;
			endforeach;
			?>
		</div>

		<?php
		if ( $args['fullscreen_general_enable'] ) {
			?>
			<a href="javascript: void(0);" class="iconic-woothumbs-fullscreen" data-iconic-woothumbs-tooltip="<?php esc_html_e( 'Fullscreen', 'iconic-woothumbs' ); ?>">
				<?php Iconic_WooThumbs_Icons::get_svg_icon( 'fullscreen' ); ?>
			</a>
			<?php
		}
		?>

		<?php
		if ( $args['video_url'] ) {
			?>
			<a href="javascript: void(0);" class="iconic-woothumbs-play" data-iconic-woothumbs-tooltip="<?php esc_html_e( 'Play Product Video', 'iconic-woothumbs' ); ?>">
				<?php Iconic_WooThumbs_Icons::get_svg_icon( 'video' ); ?>
			</a>
			<?php
		}

		/**
		 * Hook: iconic_woothumbs_after_images
		 */
		do_action( 'iconic_woothumbs_after_images' );
		?>

	</div>

	<?php
	if ( $args['video_url'] ) {
		global $post;
		?>
		<div id="iconic-woothumbs-video-template" style="display: none;">
			<div class="iconic-woothumbs-fullscreen-video-wrapper">
				<?php
				echo Iconic_WooThumbs_Media::get_media_embed( $args['video_url'], $post->ID, true );
				?>
			</div>
		</div>
		<?php
	}

	/**
	 * Hook: iconic_woothumbs_after_images_wrap
	 */
	do_action( 'iconic_woothumbs_after_images_wrap' );
}
