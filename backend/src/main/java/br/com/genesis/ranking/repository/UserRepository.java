package br.com.genesis.ranking.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.com.genesis.ranking.model.User;
import br.com.genesis.ranking.model.enums.Role;

public interface UserRepository extends JpaRepository<User, String> {
  Optional<User> findByUsernameIgnoreCase(String username);
  boolean existsByUsernameIgnoreCase(String username);
  boolean existsByUsernameIgnoreCaseAndIdNot(String username, String id);
  long countByRole(Role role);

  @Query("select distinct u.username from User u where u.role in :roles and u.username is not null and trim(u.username) <> ''")
  List<String> findDistinctUsernamesByRoleIn(Collection<Role> roles);
}
