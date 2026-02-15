<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


class NoneValueComparator extends ComparatorBase
{

    public function Compare($ComparisonType, $Value)
    {
        return false;
    }
}