<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


interface ComparisonSource
{
    public function GetValue();
    public function IsUsed();
}