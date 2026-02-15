<?php
/**
 * Class DayOfTheWeek
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use FSVendor\WPDesk\Forms\Field;

/**
 * DayOfTheWeek condition.
 */
class DayOfTheWeek extends AbstractCondition {

	use ConditionOperators;

	/** @var string */
	const CONDITION_ID = 'day_of_the_week';

	/** @var string */
	const FIELD_DAYS = 'days';

	/**
	 * DayOfTheWeek constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Day of the week', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the day the order is placed', 'flexible-shipping-pro' );
		$this->group        = __( 'Destination & Time', 'flexible-shipping-pro' );
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
		if ( ! isset( $condition_settings[ self::FIELD_DAYS ] ) ) {
			return false;
		}
		$days = wp_parse_id_list( $condition_settings[ self::FIELD_DAYS ] );

		/**
		 * Can modify day of the week passed to Day of the week condition.
		 *
		 * @param int $day_of_week Day of week.
		 *
		 * @since 2.3
		 */
		$day_of_week = (int) apply_filters( 'flexible-shipping/condition/day_of_the_week', (int) date_i18n( 'N' ) );

		$condition_matched = in_array( $day_of_week, $days, true );

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $day_of_week ) );

		return $condition_matched;
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return array(
			$this->prepare_operator_is(),
			( new Field\WooSelect() )
				->set_name( self::FIELD_DAYS )
				->set_options( $this->get_select_options() )
				->set_default_value( array( 1 ) )
				->set_placeholder( __( 'Select the days', 'flexible-shipping-pro' ) )
				->set_label( __( 'one of', 'flexible-shipping-pro' ) ),
		);
	}

	/**
	 * @param array  $condition_settings .
	 * @param bool   $condition_matched  .
	 * @param string $input_data         .
	 *
	 * @return string
	 */
	protected function format_for_log( array $condition_settings, $condition_matched, $input_data ) {
		// Translators: condition name.
		$formatted_for_log = '   ' . sprintf( __( 'Condition: %1$s;', 'flexible-shipping-pro' ), $this->get_name() );

		// Translators: operator.
		$formatted_for_log .= sprintf( __( ' operator: %1$s;', 'flexible-shipping-pro' ), $this->get_operator_label( $this->get_operator_from_settings( $condition_settings, 'all' ) ) );

		$days     = isset( $condition_settings[ self::FIELD_DAYS ] ) ? wp_parse_id_list( $condition_settings[ self::FIELD_DAYS ] ) : array();
		$all_days = $this->get_days();

		$days_to_format = array();
		foreach ( $days as $day ) {
			$days_to_format[] = $all_days[ $day ];
		}

		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' days: %1$s;', 'flexible-shipping-pro' ), implode( ', ', $days_to_format ) );
		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' input data: %1$s;', 'flexible-shipping-pro' ), $all_days[ $input_data ] );
		// Translators: matched condition.
		$formatted_for_log .= sprintf( __( ' matched: %1$s', 'flexible-shipping-pro' ), $condition_matched ? __( 'yes', 'flexible-shipping-pro' ) : __( 'no', 'flexible-shipping-pro' ) );

		return $formatted_for_log;
	}

	/**
	 * @return array
	 */
	private function get_select_options() {
		$options = array();

		foreach ( $this->get_days() as $day => $name ) {
			$options[] = $this->prepare_option( $day, $name );
		}

		return $options;
	}

	/**
	 * @return array
	 */
	private function get_days() {
		return array(
			1 => __( 'Monday', 'flexible-shipping-pro' ),
			2 => __( 'Tuesday', 'flexible-shipping-pro' ),
			3 => __( 'Wednesday', 'flexible-shipping-pro' ),
			4 => __( 'Thursday', 'flexible-shipping-pro' ),
			5 => __( 'Friday', 'flexible-shipping-pro' ),
			6 => __( 'Saturday', 'flexible-shipping-pro' ),
			7 => __( 'Sunday', 'flexible-shipping-pro' ),
		);
	}

	/**
	 * @param string $value .
	 * @param string $label .
	 *
	 * @return array
	 */
	private function prepare_option( $value, $label ) {
		return array(
			'value' => $value,
			'label' => $label,
		);
	}
}
