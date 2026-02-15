<?php
/**
 * Class CartLineItem
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;

/**
 * Cart line item condition.
 */
class CartLineItem extends AbstractCondition {

	use ConditionOperators;

	const MIN = 'min';
	const MAX = 'max';
	const CONDITION_ID = 'cart_line_item';

	/**
	 * CartLineItem constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Cart line item', 'flexible-shipping-pro' );
		$this->group        = __( 'Cart', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the number of cart line items', 'flexible-shipping-pro' );
		$this->priority     = $priority;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$min = (float) ( $condition_settings[ self::MIN ] ? $condition_settings[ self::MIN ] : 0 );
		$max = (float) ( $condition_settings[ self::MAX ] ? $condition_settings[ self::MAX ] : INF );

		/**
		 * Can modify contents lines passed to Cart line item condition.
		 *
		 * @param int $contents_lines Contents lines.
		 *
		 * @since 2.3
		 */
		$contents_lines = (int) apply_filters( 'flexible-shipping/condition/contents_lines', count( $contents->get_contents() ) );

		$condition_matched = $contents_lines >= $min && $contents_lines <= $max;

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $contents_lines ) );

		return $condition_matched;
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return array(
			$this->prepare_operator_is(),
			( new Field\InputNumberField() )
				->set_name( self::MIN )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_min' )
				->add_data( 'beacon_search', __( 'cart lines is from', 'flexible-shipping-pro' ) )
				->set_placeholder( __( 'min', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_max' )
				->add_data( 'beacon_search', __( 'lines to', 'flexible-shipping-pro' ) )
				->set_placeholder( __( 'max', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) )
				->add_data( 'suffix', __( 'lines', 'flexible-shipping-pro' ) ),
		);
	}

}
