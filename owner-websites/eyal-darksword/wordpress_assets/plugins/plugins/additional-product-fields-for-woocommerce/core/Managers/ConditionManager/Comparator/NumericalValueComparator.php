<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


class NumericalValueComparator extends ComparatorBase
{

    public function Compare($ComparisonType, $Value)
    {
        $selectedValues=$this->Source->GetValue();

        switch ($ComparisonType){
            case "Equal":
                return $this->Source->IsUsed()&&$selectedValues==$Value;
                break;
            case "NotEqual":
                return $selectedValues!=$Value;
                break;
            case "IsEmpty":
                return $this->Source->IsUsed();
                break;
            case "IsNotEmpty":
                return !$this->Source->IsUsed();
                break;
            case "GreaterThan":
                return $this->Source->IsUsed()&&$selectedValues>$Value;
                break;
            case "GreaterOrEqualThan":
                return $this->Source->IsUsed()&&$selectedValues>=$Value;
                break;
            case "LessThan":
                return $this->Source->IsUsed()&&$selectedValues<$Value;
                break;
            case "LessOrEqualThan":
                return $this->Source->IsUsed()&&$selectedValues<=$Value;
                break;
        }
    }
}