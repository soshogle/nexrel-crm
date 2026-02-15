<?php
/**
 * Class DimensionalWeight
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSVendor\WPDesk\FS\TableRate\Settings\MethodSettings;
use Psr\Log\LoggerInterface;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\Rule\Condition\DimensionalWeight\DimensionalWeightCalculator;

/**
 * Dimensional Weight.
 */
class DimensionalWeight extends AbstractCondition {
	use ConditionOperators;
	use DimensionalWeightCalculator;

	const MIN   = 'min';
	const MAX   = 'max';
	const RATIO = 'weight_ratio';

	const CONDITION_ID = 'dimensional_weight';

	/**
	 * Dimensional Weight constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Dimensional weight', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the dimensional weight of the cart or package', 'flexible-shipping-pro' );
		$this->group        = __( 'Product', 'flexible-shipping-pro' );
		$this->priority     = $priority;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 * @param MethodSettings   $method_settings    .
	 *
	 * @return bool
	 */
	public function is_condition_matched_with_method_settings( array $condition_settings, ShippingContents $contents, LoggerInterface $logger, MethodSettings $method_settings ): bool {
		$method_settings_raw = $method_settings->get_raw_settings();

		$min   = (float) ( isset( $condition_settings[ self::MIN ] ) && 0 !== strlen( $condition_settings[ self::MIN ] ) ? $condition_settings[ self::MIN ] : 0 );
		$max   = (float) ( isset( $condition_settings[ self::MAX ] ) && 0 !== strlen( $condition_settings[ self::MAX ] ) ? $condition_settings[ self::MAX ] : INF );
		$ratio = (float) str_replace( ',', '.', $method_settings_raw[ self::RATIO ] ?? '0.0' );

		if ( $ratio === 0.0 ) {
			$logger->debug( $this->format_for_log( $condition_settings, false, null, $ratio ) );

			return false;
		}

		$contents_weight =
			/**
			 * Can modify contents weight passed to Weight condition.
			 *
			 * @param float $contents_weight Contents weight.
			 *
			 * @since 4.1.1
			 */
			apply_filters( 'flexible-shipping/condition/dimensional_contents_weight', $this->get_contents_weight( $contents, $ratio ) );

		$contents_weight = (float) $contents_weight;

		$condition_matched = $contents_weight >= $min && $contents_weight <= $max;

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $contents_weight, $ratio ) );

		return $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );
	}

	/**
	 * @param array  $condition_settings .
	 * @param bool   $condition_matched  .
	 * @param string $input_data         .
	 * @param mixed  $ratio              .
	 *
	 * @return string
	 */
	protected function format_for_log( array $condition_settings, $condition_matched, $input_data, $ratio = null ): string {
		// Translators: condition name.
		$formatted_for_log = '   ' . sprintf( __( 'Condition: %1$s;', 'flexible-shipping-pro' ), $this->get_name() );

		// Translators: operator.
		$formatted_for_log .= sprintf( __( ' operator: %1$s;', 'flexible-shipping-pro' ), $this->get_operator_label( $this->get_operator_from_settings( $condition_settings, 'all' ) ) );

		if ( null === $ratio || strlen( $ratio ) === 0 ) {
			$ratio = __( 'Undefined', 'flexible-shipping-pro' );
		}

		// Translators: ratio.
		$formatted_for_log .= sprintf( __( ' DIM Factor: %1$s;', 'flexible-shipping-pro' ), (string) $ratio );

		if ( null !== $input_data ) {
			// Translators: input data.
			$formatted_for_log .= sprintf( __( ' input data: %1$s;', 'flexible-shipping-pro' ), $input_data );
		}

		// Translators: matched condition.
		$formatted_for_log .= sprintf( __( ' matched: %1$s', 'flexible-shipping-pro' ), $condition_matched ? __( 'yes', 'flexible-shipping-pro' ) : __( 'no', 'flexible-shipping-pro' ) );

		return $formatted_for_log;
	}

	/**
	 * @return Field[]
	 * @codeCoverageIgnore
	 */
	public function get_fields(): array {
		return [
			$this->prepare_operator_is(),
			( new Field\InputNumberField() )
				->set_name( self::MIN )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_min' )
				->add_data( 'beacon_search', __( 'weight is from', 'flexible-shipping-pro' ) )
				->set_placeholder( __( 'is from', 'flexible-shipping-pro' ) )
				->set_label( __( 'from', 'flexible-shipping-pro' ) ),
			( new Field\InputNumberField() )
				->set_name( self::MAX )
				->add_class( 'wc_input_decimal' )
				->add_class( 'hs-beacon-search' )
				->add_class( 'parameter_max' )
				->add_data( 'beacon_search', __( 'weight to', 'flexible-shipping-pro' ) )
				->add_data( 'suffix', get_option( 'woocommerce_weight_unit' ) )
				->set_placeholder( __( 'to', 'flexible-shipping-pro' ) )
				->set_label( __( 'to', 'flexible-shipping-pro' ) ),
		];
	}
}
