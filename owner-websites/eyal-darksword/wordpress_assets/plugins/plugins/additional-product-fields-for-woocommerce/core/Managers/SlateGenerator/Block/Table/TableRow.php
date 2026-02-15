<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block\Table;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;

class TableRow extends NodeElementBase
{

    /**
     * @inheritDoc
     */
    public function GetNodeName()
    {
        return 'tr';
    }


}