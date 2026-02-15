<?php

namespace rednaowooextraproduct\core\Managers\FormManager\ContainerManager;
use rednaowooextraproduct\core\Managers\FormManager\FBRow;

interface ContainerDataRetriever{
    /**
     * @return FBRow[]
     */
    public function GetRows();

}