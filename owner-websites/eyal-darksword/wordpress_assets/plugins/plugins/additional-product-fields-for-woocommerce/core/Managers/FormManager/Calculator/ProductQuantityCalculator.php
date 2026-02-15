<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Calculator;


use Exception;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBMultipleOptionsField;
use rednaowooextraproduct\core\Managers\FormManager\Utilities\NumericUtilities;
use rednaowooextraproduct\pr\Managers\FormManager\Fields\FBSizeChartField;

class ProductQuantityCalculator extends CalculatorBase
{
    /** @var FBSizeChartField */
    public $Field;
    public $IsValid;
    public function ExecutedCalculation($value)
    {
        return $this->CreateCalculationObject(0,0,1);


    }





}