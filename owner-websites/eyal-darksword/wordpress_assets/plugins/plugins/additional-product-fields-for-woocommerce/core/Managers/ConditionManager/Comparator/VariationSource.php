<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;

class VariationSource implements ComparisonSource
{
    /** @var FormBuilder */
    public $Model;
    public $VariationId;
    /**
     * VariationSource constructor.
     * @param $model FormBuilder
     */
    public function __construct($model,$variationId)
    {
        $this->VariationId=$variationId;
        $this->Model=$model;

    }


    public function GetValue()
    {
        return $this->Model->GetAttributeValue($this->VariationId);

    }

    public function IsUsed()
    {
        return $this->GetValue()=='';
    }
}