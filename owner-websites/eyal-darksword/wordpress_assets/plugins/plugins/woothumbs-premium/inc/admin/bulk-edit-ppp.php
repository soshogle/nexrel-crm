<?php
/**
 * Bulk edit posts per page filter
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

$ppp = !empty( $_GET['ppp'] ) ? $_GET['ppp'] : 15;

?>

<form method="get" accept-charset="utf-8" style="margin-bottom: 20px;">

	<?php $iconic_woothumbs_class->output_bulk_parameters( array( 'ppp', 'paged' ) ); ?>

	<label for=""><?php esc_html_e( 'Show:', 'iconic-woothumbs' ); ?></label>

	<select id="posts_per_page" name="ppp">
		<option value="15" <?php selected( $ppp, '15' ); ?>>15</option>
		<option value="30" <?php selected( $ppp, '30' ); ?>>30</option>
		<option value="60" <?php selected( $ppp, '60' ); ?>>60</option>
		<option value="-1" <?php selected( $ppp, '-1' ); ?>>All</option>
	</select>

	<input type="submit" value="<?php esc_attr_e( 'Submit', 'iconic-woothumbs' ); ?>" class="button button-secondary">

</form>
