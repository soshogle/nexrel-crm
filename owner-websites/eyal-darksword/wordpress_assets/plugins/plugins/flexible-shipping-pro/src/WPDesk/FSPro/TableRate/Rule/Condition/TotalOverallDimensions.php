<?php
/**
 * Class TotalOverallDimensions
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions\TotalOverallDimensionsContentsFilter;
use WPDesk\FSPro\TableRate\Rule\Condition\TotalOverallDimensions\TotalOverallDimensionsTrait;

/**
 * Total Overall Dimensions condition.
 */
class TotalOverallDimensions extends AbstractCondition {

	use ConditionOperators;
	use TotalOverallDimensionsTrait;

	/** @var string */
	const CONDITION_ID = 'total_overall_dimensions';

	const MIN = 'min';
	const MAX = 'max';

	/**
	 * TotalOverallDimensions constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Total overall dimensions', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on single product\'s summed up length, width & height', 'flexible-shipping-pro' );
		$this->group        = __( 'Product', 'flexible-shipping-pro' );
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

		$condition_matched = 0 !== count( $contents->get_contents() );

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		if ( $condition_matched ) {
			$input_data = $this->format_input_data_for_logger( $contents->get_contents() );
		} else {
			$input_data = $this->format_input_data_for_logger( $contents->get_non_filtered_contents() );
		}

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $input_data ) );

		return $condition_matched;
	}

	/**
	 * @param array $contents .
	 *
	 * @return string
	 */
	private function format_input_data_for_logger( array $contents ) {
		$dimensions = [];

		foreach ( $contents as $item ) {
			$dimensions[] = $this->get_product_sum_dimension( $item['data'] );
		}

		return implode( ', ', $dimensions );
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return [
			$this->prepare_operator_is(),
			( new Field\InputNumberField() )
				->set_name( self::MIN )
				->set_placeholder( __( 'min', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) )
				->set_attribute( 'min', 0 )
				->add_class( 'parameter_min' ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->set_placeholder( __( 'max', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) )
				->set_attribute( 'min', 0 )
				->add_class( 'parameter_max' )
				->add_data( 'suffix', get_option( 'woocommerce_dimension_unit' ) ),
		];
	}

	/**
	 * @param ShippingContents $shipping_contents  .
	 * @param array            $condition_settings .
	 *
	 * @return ShippingContents
	 */
	public function process_shipping_contents( ShippingContents $shipping_contents, array $condition_settings ) {
		$min = (float) ( isset( $condition_settings[ self::MIN ] ) && 0 !== strlen( $condition_settings[ self::MIN ] ) ? $condition_settings[ self::MIN ] : 0 );
		$max = (float) ( isset( $condition_settings[ self::MAX ] ) && 0 !== strlen( $condition_settings[ self::MAX ] ) ? $condition_settings[ self::MAX ] : INF );

		$shipping_contents->filter_contents( new TotalOverallDimensionsContentsFilter( $min, $max ) );

		return $shipping_contents;
	}
}
