<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace Aprila\Model\Admin\Manager;

use Aprila\Model\Repository\IRepository;
use Nette\Security\User;
use Nette\SmartObject;

class BaseManager implements IAdminManager
{
	use SmartObject;

	/**
	 * @var IRepository
	 */
	protected $repository;


	public function get($id = 0)
	{
		return $this->repository->get($id);
	}


	public function getBy($condition, $parameteres)
	{
		return $this->repository->getBy($condition, $parameteres);
	}


	public function findAll()
	{
		return $this->repository->findAll();
	}


	public function add($data = [])
	{
		return $this->repository->insert($data);
	}


	public function edit($id = 0, $data = [])
	{
		return $this->repository->update($id, $data);
	}


	public function remove($id = 0)
	{
		return $this->repository->delete($id);
	}

}
